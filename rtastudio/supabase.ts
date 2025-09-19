import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://mmuqlxsvhlnghfaeoyyh.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tdXFseHN2aGxuZ2hmYWVveXloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyOTc3NjYsImV4cCI6MjA2OTg3Mzc2Nn0.6W2VyajK92XclVTiARqcVtmLWT2M1arEAtd1NP3y_bA";
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
