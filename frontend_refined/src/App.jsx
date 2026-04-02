import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import MainLayout from "@/components/MainLayout.jsx";
import LoginPage from "@/pages/LoginPage.jsx";
import HomePage from "@/pages/HomePage.jsx";
import AskPage from "@/pages/AskPage.jsx";
import QuestionsPage from "@/pages/QuestionsPage.jsx";
import ExplorePage from "@/pages/ExplorePage.jsx";
import NotesPage from "@/pages/NotesPage.jsx";
import BookmarksPage from "@/pages/BookmarksPage.jsx";
import PdfChatPage from "@/pages/PdfChatPage.jsx";
import ContactPage from "@/pages/ContactPage.jsx";
import ProfilePage from "@/pages/ProfilePage.jsx";
import NotFound from "@/pages/NotFound.jsx";
import { AuthProvider, RequireAuth } from "@/lib/auth.jsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route
              element={
                <RequireAuth>
                  <MainLayout />
                </RequireAuth>
              }
            >
              <Route path="/home" element={<HomePage />} />
              <Route path="/ask" element={<AskPage />} />
              <Route path="/questions" element={<QuestionsPage />} />
              <Route path="/explore" element={<ExplorePage />} />
              <Route path="/notes" element={<NotesPage />} />
              <Route path="/bookmarks" element={<BookmarksPage />} />
              <Route path="/pdf-chat" element={<PdfChatPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
