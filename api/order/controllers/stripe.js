require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_KEY);

const Easypost = require("@easypost/api");
const api = new Easypost(
  "EZAK35f2a555621d4a918979bd9944f02072D8dpJ9KKfrtF9Hwa7qbsfA"
);

const calculateTotal = async (productsWQt, shippingTotal) => {
  const productsPayload = productsWQt.map((prod) => {
    const productPayload = strapi.services.product.findOne({
      Name: prod.name,
    });
    const product = productPayload.then((p) => ({
      prod: p,
      qt: prod.quantity,
    }));
    return product;
  });

  const prodArr = await Promise.all(productsPayload);
  const totalPayload = prodArr.map((prod) => [prod.prod.Price * prod.qt]);
  const total = totalPayload.reduce((acc, curr) => acc + curr);
  return total + shippingTotal * 100;
};

const getDimensions = async (name) => {
  try {
    const product = await strapi.services.product.findOne({
      Name: name,
    });
    return ({ id, Name, Height, Length, Width, Weight } = product);
  } catch (e) {
    return e;
  }
};

const createParcels = async (productsWQt) => {
  const dimensions = productsWQt.map((prod) => getDimensions(prod.name));
  try {
    const parcels = await Promise.all(dimensions);
    const parcelsArr = parcels.map((p) => {
      const parcel = new api.Parcel({
        length: p.Length,
        width: p.Width,
        height: p.Height,
        weight: p.Weight,
      });
      return parcel.save();
    });
    return parcelsArr;
  } catch (e) {
    return e;
  }
};

const createShipments = async (to, from, parcels) => {
  const shipments = parcels.map((p) => {
    const shipment = new api.Shipment({
      to_address: to,
      from_address: from,
      parcel: p,
    });
    return shipment.save();
  });
  return shipments;
};

module.exports = {
  createPaymentIntent: async (ctx, next) => {
    const {
      address,
      city,
      postalCode,
      state,
      productsWQt,
      fullName,
      email,
    } = ctx.request.body;

    const fromAddress = new api.Address({
      company: "WTFCKJAY WORLD",
      street1: "494 Central Ave ",
      city: "Brooklyn",
      state: "NY",
      zip: "11221",
      phone: "3474570281",
    });

    const toAddress = new api.Address({
      name: fullName,
      street1: address,
      city: city,
      state: state,
      zip: postalCode,
    });

    await fromAddress.save();

    await toAddress.save();

    const parcelsPayload = await createParcels(productsWQt);
    const parcels = await Promise.all(parcelsPayload);

    const shipmentsPayload = await createShipments(
      toAddress,
      fromAddress,
      parcels
    );
    const shipments = await Promise.all(shipmentsPayload);

    const labelsRates = shipments.map((ship) =>
      ship.buy(ship.lowestRate(["USPS"], ["First"]))
    );

    const labels = await Promise.all(labelsRates);

    const ratesPayload = labels.map((label) => label.retail_rate);
    const shippingTotal = ratesPayload.reduce((acc, curr) => acc + curr);

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: await calculateTotal(productsWQt, shippingTotal),
        shipping: {
          address: {
            line1: address,
            city: city,
            postal_code: postalCode,
            state: state,
          },
          name: fullName,
        },
        receipt_email: email,
        currency: "usd",
      });

      ctx.send({
        clientSecret: paymentIntent.client_secret,
        shippingTotal: shippingTotal,
      });

      await next();
    } catch (e) {}
  },
};
