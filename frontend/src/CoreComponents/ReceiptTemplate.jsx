export default function Receipt({ sale = null, booking = null }) {
  const hotelDataString = localStorage.getItem("hotel_data");
  const hotel_data = hotelDataString ? JSON.parse(hotelDataString) : {};

  if (!sale && !booking) {
    return <div>No receipt data available.</div>;
  }

  return (
    <div className="receipt">
      {/* Hotel Header */}
      <div className="center bold">
        {hotel_data.image_url && (
          <img
            src={hotel_data.image_url}
            alt={hotel_data.hotel_name}
            style={{
              maxWidth: "100px",
              marginBottom: "10px",
            }}
          />
        )}

        <h2>{hotel_data.hotel_name}</h2>
        <p>{hotel_data.address}</p>
        <p>{hotel_data.phone}</p>
      </div>

      <hr />

      {/* ================= SALE RECEIPT ================= */}
      {sale && (
        <>
          <p>
            <strong>Receipt #:</strong> {sale.id}
          </p>
          <p>
            <strong>Date:</strong> {sale.date}
          </p>

          <hr />

          <table width="100%">
            <thead>
              <tr>
                <th align="left">Item</th>
                <th align="center">Qty</th>
                <th align="right">Price</th>
              </tr>
            </thead>

            <tbody>
              {sale.items?.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td align="center">{item.quantity}</td>
                  <td align="right">
                    ₦{Number(item.price).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <hr />

          <table width="100%">
            <tbody>
              <tr>
                <td className="bold">Total</td>
                <td className="right bold">
                  ₦{Number(sale.total).toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>

          <hr />

          <div className="center">
            <p>Thank you for your purchase!</p>
          </div>
        </>
      )}

      {/* ================= BOOKING RECEIPT ================= */}
      {booking && (
        <>
          <p>
            <strong>Booking #:</strong> {booking.id}
          </p>
          <p>
            <strong>Date:</strong> {booking.date}
          </p>

          <hr />

          <table width="100%">
            <tbody>
              <tr>
                <td><strong>Guest</strong></td>
                <td>{booking.customer_name}</td>
              </tr>

              <tr>
                <td><strong>Room No.</strong></td>
                <td>{booking.room_number}</td>
              </tr>

              <tr>
                <td><strong>Room Type</strong></td>
                <td>{booking.room_type}</td>
              </tr>

              <tr>
                <td><strong>Check In</strong></td>
                <td>{booking.check_in}</td>
              </tr>

              <tr>
                <td><strong>Check Out</strong></td>
                <td>{booking.check_out}</td>
              </tr>

              <tr>
                <td><strong>Duration</strong></td>
                <td>{booking.duration}</td>
              </tr>

              <tr>
                <td><strong>Status</strong></td>
                <td>{booking.status}</td>
              </tr>
            </tbody>
          </table>

          <hr />

          <table width="100%">
            <tbody>
              <tr>
                <td className="bold">Total</td>
                <td className="right bold">
                  ₦{Number(booking.price).toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>

          <hr />

          <div className="center">
            <p>Thank you for booking {hotel_data.hotel_name}!</p>
          </div>
        </>
      )}
    </div>
  );
}