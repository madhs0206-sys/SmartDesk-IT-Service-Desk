
const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      default: "General",
    },
    impact: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Low",
    },
    urgency: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Low",
    },
    priority: {
      type: String,
      enum: ["P1", "P2", "P3", "P4"],
      default: "P3",
    },
    status: {
      type: String,
      enum: ["Open", "Assigned", "In Progress", "Pending Vendor", "Resolved", "Closed"],
      default: "Open",
    },
    createdBy: {
      type: String,
      default: "Anonymous",
    },
    technician: {
      type: String,
      default: "Unassigned",
    },
    resolution: {
      type: String,
      default: "",
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Ticket", ticketSchema);
