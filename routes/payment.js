// backend/routes/payment.js
const express = require('express');
const router = express.Router();
const Stripe = require('stripe');

// Charger les variables d'environnement
require('dotenv').config();

// Utiliser la clé Stripe depuis le .env
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

router.post('/create-checkout-session', async (req, res) => {
  const { productName, productPrice, successUrl, cancelUrl, customerEmail } = req.body;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: productName,
          },
          unit_amount: productPrice,
        },
        quantity: 1,
      }],
      mode: 'payment',
      customer_email: customerEmail, // 👈 Envoi de l'email à Stripe
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    res.json({ id: session.id });
  } catch (error) {
    console.error('Erreur création session Stripe:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
