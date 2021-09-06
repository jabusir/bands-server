"use strict";
require("dotenv").config();
const Easypost = require("@easypost/api");
// const api = new Easypost(process.env.EASYPOST_KEY);

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

    // const createShipments = async (to, from, parcels) => {
    //   const shipments = parcels.map((p) => {
    //     const shipment = apiMakeShipment({
    //       to_address: to,
    //       from_address: from,
    //       parcel: p,
    //     });
    //     return shipment;
    //   });
    //   return Promise.all(shipments);
    // };

    const event = ctx.request.body;
    // const getDimensions = async (name) => {
    //   try {
    //     const product = await strapi.services.product.findOne({
    //       Name: name,
    //     });
    //     const { id, Name, Height, Length, Width, Weight } = product;
    //     return { id, Name, Height, Length, Width, Weight };
    //   } catch (e) {
    //     return e;
    //   }
    // };

    // const apiMakeParcel = async (parcel) => {
    //   const apiParcel = new api.Parcel(parcel);
    //   return apiParcel.save();
    // };

    // const apiMakeShipment = async (shipment) => {
    //   const apiShipment = new api.Shipment(shipment);
    //   return apiShipment.save();
    // };

    // const createParcels = async (productsWQt) => {
    //   const dimensions = productsWQt.map((prod) => getDimensions(prod.name));
    //   try {
    //     const parcels = await Promise.all(dimensions);
    //     const parcelsArr = parcels.map((p) => {
    //       const parcel = apiMakeParcel({
    //         length: p.Length,
    //         width: p.Width,
    //         height: p.Height,
    //         weight: p.Weight,
    //       });
    //       return parcel;
    //     });
    //     return Promise.all(parcelsArr);
    //   } catch (e) {
    //     return e;
    //   }
    // };

    switch (event.type) {
      case "charge.succeeded":
        const paymentIntent = event.data.object;
        const { shipping, receipt_email, metadata } = paymentIntent;
        const { address } = shipping;
        try {
          // const fromAddress = new api.Address({
          //   company: "Bands Unlimited LLC.",
          //   street1: "13512 Dean St",
          //   city: "Tustin",
          //   state: "CA",
          //   zip: "92780",
          //   phone: "5623707369",
          // });

          // const parcelsPayload = createParcels(
          //   Object.entries(metadata).map(([key, value]) => ({
          //     name: key,
          //     quantity: value,
          //   }))
          // );

          // const toAddress = new api.Address({
          //   name: shipping.name,
          //   street1: address.line1,
          //   street2: address.line2,
          //   city: address.city,
          //   state: address.state,
          //   zip: address.postal_code,
          // });

          // await fromAddress.save();

          // await toAddress.save();

          // const parcels = await Promise.resolve(parcelsPayload);

          // const shipmentsPayload = await createShipments(
          //   toAddress,
          //   fromAddress,
          //   parcels
          // );

          // const shipments = await Promise.all(shipmentsPayload);

          // const labelsRates = shipments.map((ship) => {
          //   return ship.buy(ship.lowestRate(["USPS"], ["First"]));
          // });

          const labels = await Promise.all(labelsRates);
          const order = await strapi.services.order.create({
            fullName: shipping.name,
            address: address.line1,
            line2: address.line2,
            productWQt: Object.entries(metadata).map(([key, value]) => ({
              product: key,
              quantity: value,
            })),
            postalCode: address.postal_code,
            city: address.city,
            state: address.state,
            email: receipt_email,
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
