# Stripe Setup Guide

To enable payments, you need to set up Stripe and add the API keys to your `.env.local` file.

## 1. Create a Stripe Account
Go to [stripe.com](https://stripe.com) and sign up for an account.

## 2. Get API Keys
1.  Go to the **Developers** section in your Stripe Dashboard.
2.  Click on **API keys**.
3.  Copy the **Publishable key** and **Secret key**.

## 3. Add Keys to Environment Variables
Create or update your `.env.local` file with the following:

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

> [!IMPORTANT]
> Make sure to use the **Test mode** keys for development.

## 4. Webhooks (Optional for basic testing)
For production, you will need to set up webhooks to handle payment events securely.
