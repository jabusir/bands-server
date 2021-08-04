"use strict";
require("dotenv").config();
const Easypost = require("@easypost/api");
const api = new Easypost(process.env.EASYPOST_KEY);

const getDimensions = async (name) => {
  try {
    const product = await strapi.services.product.findOne({
      Name: name,
    });
    const { id, Name, Height, Length, Width, Weight } = product;
    return { id, Name, Height, Length, Width, Weight };
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
  create: async (ctx) => {
    const {
      address,
      city,
      postalCode,
      state,
      products,
      fullName,
      email,
    } = ctx.request.body;

    const event = ctx.request.body;

    switch (event.type) {
      case "charge.succeeded":
        const paymentIntent = event.data.object;
        try {
          console.log(event);
          const fromAddress = new api.Address({
            company: "WTFCKJAY WORLD",
            street1: "494 Central Ave ",
            city: "Brooklyn",
            state: "NY",
            zip: "11221",
            phone: "3474570281",
          });

          const toAddress = new api.Address({
            name: "Jehad",
            street1: "13512 Dean St",
            city: "Tustin",
            state: "CA",
            zip: "92780",
          });

          await fromAddress.save();

          await toAddress.save();

          const parcelsPayload = await createParcels([
            { name: "big boy", quantity: 3 },
          ]);

          const parcels = await Promise.all(parcelsPayload);
          const shipmentsPayload = await createShipments(
            toAddress,
            fromAddress,
            parcels
          );

          const shipments = await Promise.all(shipmentsPayload);

          const labelsRates = shipments.map((ship) => {
            return ship.buy(ship.lowestRate(["USPS"], ["First"]));
          });

          const labels = await Promise.all(labelsRates);
          const order = await strapi.services.order.create({
            fullName: "Jehad Abusir",
            address: "13512 Dean St",
            products: [1],
            productWQt: [{ product: "big boy", quantity: 3 }],
            postalCode: "92780",
            city: "Tustin",
            state: "CA",
            email: "jabusir@gmail.com",
          });
          ctx.send({ order: order });
          // Register the order in the database
        } catch (err) {
          ctx.send(err);
          console.log(err);
          return err;
        }
        break;
      case "payment_method.attached":
        const paymentMethod = event.data.object;
        // Then define and call a method to handle the successful attachment of a PaymentMethod.
        // handlePaymentMethodAttached(paymentMethod);
        break;
      // ... handle other event types
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    // Charge the customer
  },
};
