"use client"
import React from "react"
import { jsPDF } from "jspdf"
import { Document, Packer, Paragraph, TextRun } from "docx"
import { saveAs } from "file-saver"
import { Button } from "@/components/ui/button"

// JSON data (you can import from separate file too)
const hotelData = {
  hotelDescription:
    "BrightHaven Hotel offers a blend of comfort, elegance, and modern convenience in the heart of the city. Designed for both leisure and business travelers, the hotel provides a welcoming atmosphere with tastefully furnished rooms, on-site dining, and easy access to nearby attractions. Whether you’re here for a quick getaway or an extended stay, our attentive staff ensures every guest enjoys a relaxing and memorable experience.",
  policies: {
    checkInOut: {
      checkIn: "2:00 PM",
      checkOut: "12:00 PM",
      notes:
        "Early check-in and late check-out are subject to availability and may incur additional charges.",
    },
    cancellation: {
      policy: [
        "Free cancellation up to 24 hours before arrival.",
        "Cancellations made less than 24 hours prior to check-in may be charged one night’s stay.",
      ],
    },
    childrenAndExtraBeds: {
      policy: [
        "Children under 6 years stay free when using existing bedding.",
        "Extra beds are available on request (additional charge may apply).",
      ],
    },
    pets: "Pets are not allowed on the property.",
    paymentMethods: [
      "All major credit cards are accepted (Visa, MasterCard, American Express).",
      "Cash and mobile payments are also accepted at the front desk.",
    ],
    smokingPolicy: [
      "Smoking is strictly prohibited in all indoor areas.",
      "Designated outdoor smoking zones are available.",
    ],
  },
  amenities: {
    generalAmenities: [
      "24-hour front desk service",
      "Free high-speed Wi-Fi",
      "On-site restaurant & bar",
      "Room service",
      "Daily housekeeping",
      "Elevator access",
      "Secure parking",
      "Airport shuttle service (on request)",
    ],
    roomFeatures: [
      "Air conditioning",
      "Smart TV with streaming services",
      "In-room safe",
      "Mini refrigerator",
      "Complimentary bottled water",
      "Work desk & chair",
      "Private bathroom with hot shower",
      "Free toiletries",
    ],
    leisureAndWellness: [
      "Outdoor swimming pool",
      "Fitness center",
      "Spa & wellness services",
      "Lounge area",
      "Garden courtyard",
    ],
    businessServices: [
      "Conference & meeting rooms",
      "Business center",
      "Printing and photocopying services",
    ],
  },
}

export default function HotelInfoExporter() {

  const downloadWord = async () => {
    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({ children: [new TextRun({ text: "🏨 Hotel Description", bold: true, size: 28 })] }),
            new Paragraph(hotelData.hotelDescription),
            new Paragraph({ text: " " }),
            new Paragraph({ children: [new TextRun({ text: "📜 Hotel Policies", bold: true, size: 28 })] }),
            ...Object.entries(hotelData.policies).map(([key, value]) =>
              new Paragraph({
                children: [
                  new TextRun({ text: key.replace(/([A-Z])/g, " $1") + ":", bold: true }),
                  new TextRun({
                    text: Array.isArray(value)
                      ? value.join(", ")
                      : typeof value === "string"
                      ? " " + value
                      : JSON.stringify(value),
                  }),
                ],
              })
            ),
            new Paragraph({ text: " " }),
            new Paragraph({ children: [new TextRun({ text: "🌟 Hotel Amenities", bold: true, size: 28 })] }),
            ...Object.entries(hotelData.amenities).map(
              ([section, items]) =>
                new Paragraph({
                  children: [
                    new TextRun({ text: section.replace(/([A-Z])/g, " $1") + ":", bold: true }),
                    new TextRun({ text: " " + items.join(", ") }),
                  ],
                })
            ),
          ],
        },
      ],
    })

    const blob = await Packer.toBlob(doc)
    saveAs(blob, "Hotel_Info.docx")
  }

  return (
        <Button
          onClick={downloadWord}
          className=""
        >
          Download Template
        </Button>

  )
}
