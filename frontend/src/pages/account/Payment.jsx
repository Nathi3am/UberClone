import React, { useState } from "react";
import { toast } from "react-toastify";

const Payment = () => {
  const MAX_CARDS = 3;
  const [cards, setCards] = useState([]);
  const [formData, setFormData] = useState({
    cardholderName: "",
    cardNumber: "",
    expiryDate: "",
    cvv: "",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let formattedValue = value;

    // Format card number (spaces every 4 digits)
    if (name === "cardNumber") {
      formattedValue = value
        .replace(/\s/g, "")
        .replace(/(\d{4})/g, "$1 ")
        .trim();
    }

    // Format expiry date (MM/YY)
    if (name === "expiryDate") {
      formattedValue = value
        .replace(/\D/g, "")
        .substring(0, 4)
        .replace(/(\d{2})(\d{0,2})/, "$1/$2");
    }

    // Limit CVV to 3 digits
    if (name === "cvv") {
      formattedValue = value.replace(/\D/g, "").substring(0, 3);
    }

    setFormData((prev) => ({
      ...prev,
      [name]: formattedValue,
    }));
  };

  const handleAddCard = () => {
    if (cards.length >= MAX_CARDS) {
      toast.error(`Maximum ${MAX_CARDS} cards allowed`);
      return;
    }

    if (
      !formData.cardholderName ||
      !formData.cardNumber ||
      !formData.expiryDate ||
      !formData.cvv
    ) {
      toast.error("Please fill in all fields");
      return;
    }

    if (formData.cardNumber.replace(/\s/g, "").length !== 16) {
      toast.error("Card number must be 16 digits");
      return;
    }

    if (formData.expiryDate.split("/")[0] > 12) {
      toast.error("Invalid expiry month");
      return;
    }

    const newCard = {
      id: Date.now(),
      cardholderName: formData.cardholderName,
      last4: formData.cardNumber.slice(-4),
      expiryDate: formData.expiryDate,
      isDefault: cards.length === 0,
    };

    setCards((prev) => [...prev, newCard]);
    setFormData({
      cardholderName: "",
      cardNumber: "",
      expiryDate: "",
      cvv: "",
    });
    toast.success("Card added successfully");
  };

  const handleDeleteCard = (cardId) => {
    const updatedCards = cards.filter((card) => card.id !== cardId);

    // If deleted card was default, set new default
    if (cards.find((card) => card.id === cardId)?.isDefault && updatedCards.length > 0) {
      updatedCards[0].isDefault = true;
    }

    setCards(updatedCards);
    toast.success("Card removed");
  };

  const handleSetDefault = (cardId) => {
    const updatedCards = cards.map((card) => ({
      ...card,
      isDefault: card.id === cardId,
    }));
    setCards(updatedCards);
    toast.success("Default card updated");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">Payment Methods</h2>
        <p className="text-gray-400">
          Manage your payment methods (Maximum {MAX_CARDS} cards)
        </p>
      </div>

      {/* Cards List */}
      {cards.length > 0 && (
        <div className="space-y-4">
          {cards.map((card) => (
            <div
              key={card.id}
              className={`bg-gradient-to-r from-indigo-500/20 to-blue-500/20 border rounded-xl p-6 flex items-center justify-between ${
                card.isDefault ? "border-indigo-500/50" : "border-white/10"
              }`}
            >
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">💳</span>
                  <div>
                    <p className="text-white font-semibold">{card.cardholderName}</p>
                    <p className="text-gray-400 text-sm">
                      Card ending in {card.last4}
                    </p>
                  </div>
                  {card.isDefault && (
                    <span className="ml-4 px-3 py-1 bg-indigo-500/30 text-indigo-300 text-xs font-semibold rounded-full border border-indigo-500/50">
                      Default
                    </span>
                  )}
                </div>
                <p className="text-gray-500 text-sm">Expires: {card.expiryDate}</p>
              </div>

              <div className="flex gap-2">
                {!card.isDefault && (
                  <button
                    onClick={() => handleSetDefault(card.id)}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm text-gray-300 hover:text-white transition-all duration-300"
                  >
                    Set Default
                  </button>
                )}
                <button
                  onClick={() => handleDeleteCard(card.id)}
                  className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-sm text-red-400 hover:text-red-300 transition-all duration-300"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-500/10 to-blue-500/10 text-center text-gray-300 font-semibold shadow-sm">
        Auto trigger payments coming soon
      </div>

      {/* Empty State */}
      {cards.length === 0 && (
        <div className="bg-[#121826]/70 backdrop-blur-xl rounded-2xl p-12 border border-white/10 text-center">
          <div className="text-5xl mb-4">💳</div>
          <p className="text-gray-400 mb-2">Auto trigger payments coming soon</p>
        </div>
      )}
    </div>
  );
};

export default Payment;
