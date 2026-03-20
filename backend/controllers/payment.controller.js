const axios = require("axios");
const Ride = require("../models/ride.model");

exports.initializePayment = async (req, res) => {
  try {
    const { email, amount, rideId } = req.body;

    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email,
        amount: amount * 100,
        metadata: { rideId }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    res.json(response.data);
  } catch (err) {
    console.log(err.response?.data || err.message);
    res.status(500).json({ message: "Payment init failed" });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { reference } = req.params;

    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
        }
      }
    );

    const data = response.data.data;

    if (data.status === "success") {
      const rideId = data.metadata.rideId;

      await Ride.findByIdAndUpdate(rideId, {
        paymentStatus: "paid"
      });

      return res.json({ message: "Payment verified" });
    }

    res.status(400).json({ message: "Payment not successful" });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Verification failed" });
  }
};
