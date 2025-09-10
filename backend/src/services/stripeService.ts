import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
})

export class StripeService {
  // Create a payment intent for a donation
  static async createPaymentIntent(amount: number, donorEmail: string, donorName: string, donationType: string) {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        metadata: {
          donor_email: donorEmail,
          donor_name: donorName,
          donation_type: donationType,
          amount: amount.toString(),
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
        return {
          success: true,
          eventType: 'payment_intent.succeeded',
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount,
          metadata: paymentIntent.metadata,
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
