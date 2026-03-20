import React, { useContext, useEffect, useState } from "react";
import { SocketContext } from "../../context/SocketContext";
import { CaptainDataContext } from "../../context/CaptainContext";
import RideCard from "../../components/RideCard";
import axios from "axios";
import API from "../../config/api";

const ActiveRequests = () => {
  const { socket } = useContext(SocketContext);
  const { captain } = useContext(CaptainDataContext);
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    // initial load: fetch pending rides
    const token = localStorage.getItem("token");
    axios
      .get(`${API}/rides/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setRequests(res.data || []);
      })
      .catch((err) => {
        //console.log(err);
      });

    // Listen for incoming requests for this captain
    socket.on("captain_receive_request", (ride) => {
      // Ensure this request is for this captain (server should handle routing)
      setRequests((prev) => [ride, ...prev]);
    });

    return () => {
      socket.off("captain_receive_request");
    };
  }, [socket]);

  const handleAccept = async (ride) => {
    const token = localStorage.getItem("token");
    try {
      const res = await axios.patch(
        `${API}/rides/${ride._id}/accept`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // remove from list
      setRequests((prev) => prev.filter((r) => r._id !== ride._id));
    } catch (err) {
      //console.log(err);
    }
  };

  const handleDecline = async (ride) => {
    const token = localStorage.getItem("token");
    try {
      await axios.patch(`${API}/rides/${ride._id}/decline`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setRequests((prev) => prev.filter((r) => r._id !== ride._id));
    } catch (err) {
      //console.log(err);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white">Active Requests</h2>
      {requests.length === 0 ? (
        <div className="bg-[#121826]/70 backdrop-blur-xl rounded-2xl p-8 border border-white/10 text-center">
          <p className="text-gray-400">No active requests right now</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((ride) => (
            <RideCard key={ride._id} ride={ride} onAccept={handleAccept} onDecline={handleDecline} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ActiveRequests;
