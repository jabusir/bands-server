require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_KEY);

const Easypost = require("@easypost/api");
const api = new Easypost(
  "EZTKf13365bdcd7f4408bc249133acb89253kFkAegtviz9Ue3lICJ8YfA"
);

const fetchProductByName = async (name) => {
  try {
    const product = await strapi.services.product.findOne({ Name: name });
    return product;
  } catch (e) {
    console.log(e);
  }
};

const calculateTotal = async (productsWQt, shippingTotal) => {
  try {
    const productsPayload = productsWQt.map((prod) => {
      const productPayload = fetchProductByName(prod.name);
      const product = productPayload.then((p, i) => {
        return {
          prod: p,
          qt: prod.quantity,
        };
      });
      return product;
    });

    const prodArr = await Promise.all(productsPayload);
    const totalPayload = prodArr.map((prod) => prod.prod.Price * prod.qt);
    const total = totalPayload.reduce((acc, curr) => acc + curr);
    return +total + +shippingTotal;
  } catch (e) {
    console.log(e);
  }
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

    try {
      const productsWQtObj = JSON.parse(productsWQt);

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

      const parcelsPayload = await createParcels(productsWQtObj);
      const parcels = await Promise.all(parcelsPayload);

      const shipmentsPayload = await createShipments(
        toAddress,
        fromAddress,
        parcels
      );
      const shipments = await Promise.all(shipmentsPayload);

      const labelsRates = shipments.map((ship) =>
        ship.lowestRate(["USPS"], ["First"])
      );

      const labels = await Promise.all(labelsRates);

      const ratesPayload = labels.map((label) => parseInt(label.retail_rate));
      const shippingTotal = ratesPayload.reduce((acc, curr) => acc + curr);
      const totalAmount = await calculateTotal(productsWQtObj, shippingTotal);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: totalAmount * 100,
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
        total: totalAmount * 100,
      });

      await next();
    } catch (e) {
      console.log(e);
    }
  },
};
