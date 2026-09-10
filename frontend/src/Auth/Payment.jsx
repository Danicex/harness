import { useMyContext } from "@/Context/AppContext";
import { PaystackButton } from "react-paystack";

const PaystackBtn = ({ email, amount, name, phone, handlePost, handleCancel }) => {
  // ✅ Environment variables in Vite must start with VITE_
  const publicKey = import.meta.env.VITE_PAYMENT_KEY;

  // ✅ Paystack amount must be in kobo (multiply by 100)
  const amountInKobo = Math.round(Number(amount) * 100);

  const componentProps = {
    email,
    currency: 'USD', 
    amount: amountInKobo,
    metadata: {
      name,
      phone,
    },
    publicKey,
    text: "Pay Now",
    onSuccess: ()=>{
      handlePost()
    },
    onClose:()=>{
      handleCancel()
    } 
    ,
  };

  return (
    <div>
      <PaystackButton
        {...componentProps}
        className={`py-2 px-4 rounded hover:opacity-90 transition bg-white text-black`}
      />
    </div>
  );
};

export default PaystackBtn;
