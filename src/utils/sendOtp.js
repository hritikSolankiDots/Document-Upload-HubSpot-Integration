import twilio from 'twilio';
import dotenv from 'dotenv';
dotenv.config();

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export const sendOtp = async (to, message) => {
  if (!process.env.TWILIO_PHONE_NUMBER) throw new Error('Twilio phone number not set');
  return client.messages.create({
    from: process.env.TWILIO_PHONE_NUMBER,
    to,
    body: message
  });
};
