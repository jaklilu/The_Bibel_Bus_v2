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
   * Monthly recurring: Stripe Subscriptions bill every interval (PaymentIntent alone cannot recur).
   * First invoice gets a PaymentIntent; confirmCardPayment works the same as one-time.
   */
  static async createMonthlySubscription(
    amount: number,
    donorEmail: string,
    donorName: string,
    donationId: number,
    anonymous: boolean
  ) {
    try {
      const customer = await stripe.customers.create({
        email: donorEmail,
        name: donorName,
        metadata: {
          donation_id: String(donationId),
          donor_email: donorEmail,
          donor_name: donorName,
        },
      })

      const product = await stripe.products.create({
        name: 'The Bible Bus Monthly Donation',
      })

      const price = await stripe.prices.create({
        currency: 'usd',
        unit_amount: Math.round(amount * 100),
        recurring: { interval: 'month' },
        product: product.id,
      })

      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: price.id }],
        metadata: {
          donation_id: String(donationId),
          donor_email: donorEmail,
          donor_name: donorName,
          donation_type: 'monthly',
          amount: amount.toString(),
          anonymous: anonymous ? '1' : '0',
        },
        payment_behavior: 'default_incomplete',
        payment_settings: {
          save_default_payment_method: 'on_subscription',
        },
        expand: ['latest_invoice'],
      })

      let latestInv = subscription.latest_invoice
      const invoiceId =
        typeof latestInv === 'string' ? latestInv : (latestInv as Stripe.Invoice)?.id
      if (!invoiceId) {
        return {
          success: false,
          error: 'Subscription missing invoice',
        }
      }

      const invoice = await stripe.invoices.retrieve(invoiceId, {
        expand: ['payment_intent'],
      })

      const piRef = (invoice as Stripe.Invoice & { payment_intent?: string | Stripe.PaymentIntent })
        .payment_intent
      if (!piRef) {
        return {
          success: false,
          error: 'Invoice did not include a payment intent',
        }
      }

      const paymentIntent =
        typeof piRef === 'string' ? await stripe.paymentIntents.retrieve(piRef) : piRef

      if (!paymentIntent.client_secret) {
        return {
          success: false,
          error: 'Missing client secret for subscription payment',
        }
      }

      return {
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        subscriptionId: subscription.id,
        customerId: customer.id,
      }
    } catch (error) {
      console.error('Error creating monthly subscription:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create subscription',
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
