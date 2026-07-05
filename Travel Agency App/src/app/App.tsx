import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AuthProvider } from "./contexts/AuthContext";
import { LanguageProvider } from "./contexts/LanguageContext";

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </LanguageProvider>
  );
}
