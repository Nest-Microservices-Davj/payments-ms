import { Inject, Injectable, Logger } from '@nestjs/common';
import { NATS_SERVICE, envs } from 'src/config';
import Stripe from 'stripe';
import { PaymentSessionDto } from './dto/payment-session.dto';
import { Request, Response } from 'express';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class PaymentsService {
  private readonly stripe = new Stripe(envs.stripeApiKey);
  private readonly logger = new Logger('Payment Service');

  constructor(
    @Inject(NATS_SERVICE) private readonly clientProxy: ClientProxy,
  ) {}

  async createPaymentSession(paymentSessionDto: PaymentSessionDto) {
    const { currency, items, orderId } = paymentSessionDto;

    const lineItems = items.map(({ name, price, quantity }) => ({
      price_data: {
        currency,
        product_data: {
          name,
        },
        unit_amount: Math.round(price * 100),
      },
      quantity,
    }));

    const session = await this.stripe.checkout.sessions.create({
      payment_intent_data: {
        metadata: {
          orderId,
        },
      },

      line_items: lineItems,
      mode: 'payment',
      success_url: envs.stripeSuccessUrl,
      cancel_url: envs.stripeCancelUrl,
    });

    return session;
  }
  async stripeWebhook(req: Request, res: Response) {
    const sig = req.headers['stripe-signature'];

    let event: Stripe.Event;
    const endpointSecret = envs.stripeEndpointSecret;

    try {
      event = this.stripe.webhooks.constructEvent(
        req['rawBody'],
        sig,
        endpointSecret,
      );

      switch (event.type) {
        case 'charge.succeeded':
          const chargeSucceeded = event.data.object;
          const payload = {
            stripePaymentId: chargeSucceeded.id,
            orderId: chargeSucceeded.metadata.orderId,
            receiptUrl: chargeSucceeded.receipt_url,
          };

          this.clientProxy.emit('payment.succeed', payload);
          break;
        default:
          console.log(`Unhandled event type ${event.type}`);
      }
    } catch (err) {
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }
    return res.status(200).json({ sig });
  }
}
