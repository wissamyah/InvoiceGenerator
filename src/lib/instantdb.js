import { init, id } from "@instantdb/react";

// Initialize Instant DB with app ID from environment variables
const APP_ID = import.meta.env.VITE_INSTANTDB_APP_ID;

if (!APP_ID) {
  throw new Error(
    "VITE_INSTANTDB_APP_ID is not defined. Please check your .env file."
  );
}

// Initialize Instant DB
// Note: Instant DB creates tables automatically when you first write data
// Schema can be defined in the Instant DB dashboard if needed
// devtool: false disables the floating devtool icon in the bottom left
const db = init({
  appId: APP_ID,
  devtool: false,
});

export { id };
export default db;
