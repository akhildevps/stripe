const express = require('express');
const app = express();
const bodyparser = require('body-parser')
const path = require('path')
const Stripe = require('stripe');
app.use(bodyparser.urlencoded({ extended: false }))
app.use(bodyparser.json())

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}
const stripe_secretkey = process.env.STRIPE_SECRETKEY;
const stripe_publickey = process.env.STRIPE_PUBLICKEY;

app.use(express.static('client'));
const stripe = Stripe(stripe_secretkey);

/** Get all customers */
app.get('/customer', async (req, res) => {
    const customers = await stripe.customers.list({
        limit: 10,
    });
    res.json(customers.data)
})

/** Get all transactions */
app.get('/transactions', async (req, res) => {
    const charges = await stripe.charges.list({
        limit: 10,
      });
    res.json(charges.data)
})

/** Get customer */
app.get('/customer/:id', async (req, res) => {
    let customerId = req.params.id
    const customer = await stripe.customers.retrieve(
        customerId
      );
      const balanceTransactions = await stripe.customers.listBalanceTransactions(
        customerId,
        {limit: 3}
      );
    customer.balanceTransactions = balanceTransactions;
    res.json(customer)
})


/** Make payment */
app.post('/payment', async function (req, res, next) {
    stripe.tokens.create({
        card: {
            number: req.body.cardNumber,
            exp_month: req.body.expityMonth,
            exp_year: req.body.expityYear,
            cvc: req.body.cvCode,
        },
    }).then((tokenData) => {
        let stripeToken = tokenData.id;
        return stripe.customers.create({
            email:  req.body.email,
            source: stripeToken,
            name:  req.body.name,
            address: {
                line1: 'TC 9/4 Old MES colony',
                postal_code: '452331',
                city: 'Indore',
                state: 'Madhya Pradesh',
                country: 'India',
            }
        });
    }).then((customer) => {
        return stripe.charges.create({
            amount: req.body.amount,
            description: 'Web Development Product',
            currency: 'INR',
            customer: customer.id
        });
    }).then(() => {
        res.json({status:200, message:"success"});
    }).catch(err => {
        handleError(res, err);
    })
});

// Handle errors
function handleError(res, err) {

    let errMessage = 'Error in stripe';
    switch (err.type) {
        case 'StripeCardError':
            // A declined card error
            err.message; // => e.g. "Your card's expiration year is invalid."
            break;
        case 'StripeRateLimitError':
            // Too many requests made to the API too quickly
            break;
        case 'StripeInvalidRequestError':
            // Invalid parameters were supplied to Stripe's API
            break;
        case 'StripeAPIError':
            // An error occurred internally with Stripe's API
            break;
        case 'StripeConnectionError':
            // Some kind of error occurred during the HTTPS communication
            break;
        case 'StripeAuthenticationError':
            // You probably used an incorrect API key
            break;
        default:
            // Handle any other types of unexpected errors
            break;
    }
    res.json({ "message": errMessage, status: 400 });
}

app.listen(3000, () => {
    console.log("app listening on port http://localhost:3000")
})