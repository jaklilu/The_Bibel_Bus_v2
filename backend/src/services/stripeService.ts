import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
})

export class StripeService {
  // One-time donation: PaymentIntent only charges once.
  static async createPaymentIntent(
    amount: number,
    donorEmail: string,
    donorName: string,
    donationType: string,
    donationId: number
  ) {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        metadata: {
          donor_email: donorEmail,
          donor_name: donorName,
          donation_type: donationType,
          amount: amount.toString(),
          donation_id: String(donationId),
        },
        automatic_payment_methods: {
          enabled: true,
        },
      })

      return {
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      }
    } catch (error) {
      console.error('Error creating payment intent:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create payment intent',
      }
    }
  }

  /**
   * Monthly recurring: host payment on Stripe Checkout so the card is collected and the
   * subscription activates reliably (embedded Elements often left invoices "open" with no PM).
   */
  static async createMonthlyCheckoutSession(
    amount: number,
    donorEmail: string,
    donorName: string,
    donationId: number,
    anonymous: boolean
  ) {
    const baseUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')
    try {
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer_email: donorEmail,
        client_reference_id: String(donationId),
        line_items: [
          {
            price_data: {
              currency: 'usd',
              unit_amount: Math.round(amount * 100),
              recurring: { interval: 'month' },
              product_data: {
                name: 'The Bible Bus Monthly Donation',
              },
            },
            quantity: 1,
          },
        ],
        metadata: {
          donation_id: String(donationId),
          donor_email: donorEmail,
          donor_name: donorName,
          donation_type: 'monthly',
          amount: amount.toString(),
          anonymous: anonymous ? '1' : '0',
        },
        subscription_data: {
          metadata: {
            donation_id: String(donationId),
            donor_email: donorEmail,
            donor_name: donorName,
            donation_type: 'monthly',
            amount: amount.toString(),
          },
        },
        success_url: `${baseUrl}/donate?donation=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/donate?donation_canceled=1`,
      })

      if (!session.url) {
        return {
          success: false,
          error: 'Checkout session did not return a URL',
        }
      }

      return {
        success: true,
        url: session.url,
        sessionId: session.id,
      }
    } catch (error) {
      console.error('Error creating monthly Checkout session:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start Checkout',
      }
    }
  }

  // Retrieve a payment intent to check its status
  static async getPaymentIntent(paymentIntentId: string) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
      return {
        success: true,
        paymentIntent,
      }
    } catch (error) {
      console.error('Error retrieving payment intent:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve payment intent',
      }
    }
  }

  // Handle webhook events (for payment confirmations)
  static async handleWebhook(body: Buffer | string, signature: string) {
    try {
      const event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      )

      if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        let metadata: Stripe.Metadata = { ...paymentIntent.metadata }

        const piExt = paymentIntent as Stripe.PaymentIntent & {
          invoice?: string | Stripe.Invoice | null
        }

        // Subscription first charge: PI metadata is often empty; copy from Subscription.
        if (!metadata.donor_email && piExt.invoice) {
          const invId =
            typeof piExt.invoice === 'string'
              ? piExt.invoice
              : (piExt.invoice as Stripe.Invoice).id
          if (invId) {
            const inv = await stripe.invoices.retrieve(invId, { expand: ['subscription'] })
            const invExt = inv as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null }
            const subRef = invExt.subscription
            if (typeof subRef === 'string') {
              const sub = await stripe.subscriptions.retrieve(subRef)
              metadata = { ...metadata, ...sub.metadata }
            } else if (subRef && typeof subRef === 'object' && 'metadata' in subRef) {
              metadata = { ...metadata, ...(subRef as Stripe.Subscription).metadata }
            }
          }
        }

        return {
          success: true,
          eventType: 'payment_intent.succeeded',
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount,
          metadata,
        }
      }

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session
        const meta = { ...(session.metadata || {}) } as Stripe.Metadata
        if (!meta.donation_id && session.client_reference_id) {
          meta.donation_id = session.client_reference_id
        }
        // Session.metadata is not always present on webhook payloads; Checkout fills customer_details.
        const details = session.customer_details
        if (!meta.donor_email && details?.email) {
          meta.donor_email = details.email
        }
        if (!meta.donor_name && details?.name) {
          meta.donor_name = details.name
        }
        if (!meta.donor_email && session.customer_email) {
          meta.donor_email = session.customer_email
        }
        if (!meta.amount && session.amount_total != null) {
          meta.amount = String(session.amount_total / 100)
        }
        const cust = session.customer
        const sub = session.subscription
        return {
          success: true,
          eventType: 'checkout.session.completed',
          metadata: meta,
          customerId: typeof cust === 'string' ? cust : cust?.id,
          subscriptionId: typeof sub === 'string' ? sub : sub?.id,
          amountTotal: session.amount_total,
        }
      }

      return {
        success: true,
        eventType: event.type,
        handled: false,
      }
    } catch (error) {
      console.error('Error handling webhook:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to handle webhook',
      }
    }
  }
}
