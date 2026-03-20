import React from "react";
import { FaMapMarkerAlt, FaShoppingBag, FaBus, FaPlane, FaUtensils, FaTree, FaHospital, FaGasPump, FaStore, FaHotel, FaUniversity, FaGlassMartiniAlt } from 'react-icons/fa';

const LocationSearchPanel = ({ suggestions = [], onSuggestionSelect }) => {
  const safeSuggestions = Array.isArray(suggestions) ? suggestions : [];

  const getIcon = (types = [], description = '') => {
    const t = (types || []).join(',');
    if (t.includes('shopping_mall') || /mall/i.test(description)) return <FaShoppingBag className="w-5 h-5 text-white" />;
    if (t.includes('train_station') || t.includes('bus_station') || /station/i.test(description)) return <FaBus className="w-5 h-5 text-white" />;
    if (t.includes('airport') || /airport/i.test(description)) return <FaPlane className="w-5 h-5 text-white" />;
    if (t.includes('restaurant') || t.includes('cafe') || /restaurant|cafe/i.test(description)) return <FaUtensils className="w-5 h-5 text-white" />;
    if (t.includes('park') || /park/i.test(description)) return <FaTree className="w-5 h-5 text-white" />;
    if (t.includes('hospital') || /hospital|clinic/i.test(description)) return <FaHospital className="w-5 h-5 text-white" />;
    if (t.includes('gas_station') || /fuel|petrol|gas station|garage/i.test(description)) return <FaGasPump className="w-5 h-5 text-white" />;
    if (t.includes('grocery_or_supermarket') || t.includes('supermarket') || /supermarket|grocery|mart/i.test(description)) return <FaStore className="w-5 h-5 text-white" />;
    if (t.includes('lodging') || /hotel|inn|motel|hostel/i.test(description)) return <FaHotel className="w-5 h-5 text-white" />;
    if (t.includes('bank') || /bank|atm/i.test(description)) return <FaUniversity className="w-5 h-5 text-white" />;
    if (t.includes('school') || t.includes('university') || /school|college|university/i.test(description)) return <FaUniversity className="w-5 h-5 text-white" />;
    if (t.includes('convenience_store') || /convenience|corner shop|bodega/i.test(description)) return <FaStore className="w-5 h-5 text-white" />;
    if (t.includes('bar') || t.includes('night_club') || /bar|club|nightclub/i.test(description)) return <FaGlassMartiniAlt className="w-5 h-5 text-white" />;
    return <FaMapMarkerAlt className="w-5 h-5 text-white" />;
  };

  return (
    <div className="rounded-2xl border border-white/15 bg-black/70 backdrop-blur-xl shadow-2xl ring-1 ring-white/10">
      {safeSuggestions.map((suggestion, index) => (
        <div
          onClick={() => onSuggestionSelect(suggestion.description)}
          key={index}
          className="flex flex-row items-center justify-start w-full py-3 cursor-pointer hover:bg-white/10 px-3 transition"
        >
          <div className="h-10 w-10 rounded-full flex items-center justify-center bg-blue-700/90 text-blue-100 mr-3">
            {getIcon(suggestion.types, suggestion.description)}
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-white truncate">{suggestion.structured_formatting?.main_text || suggestion.description}</div>
            <div className="text-xs text-gray-300 truncate">{suggestion.structured_formatting?.secondary_text || ''}</div>
          </div>
        </div>
      ))}
      {safeSuggestions.length === 0 && (
        <div className="p-3 text-center text-gray-400">Type to search locations and choose from results</div>
      )}
    </div>
  );
};

export default LocationSearchPanel;
