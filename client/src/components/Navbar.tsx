import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  FileCheck,
  User,
  LogOut,
  HistoryIcon,
  Menu,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { logout } from "@/api/user";
import { useToast } from "@/hooks/use-toast";

export const Navbar = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleNavigateToHistory = () => {
    navigate("/records");
  };
  const handleLogout = async () => {
    try {
      await logout();
    } catch {}
    toast({ title: "Signed out", description: "You have been logged out." });
    navigate("/auth");
  };
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm">
      <div className="container mx-auto px-2 md:px-6 py-4 flex items-center justify-between">
        {/* Logo Section */}
        <div className="flex flex-1 items-center space-x-4">
          <div className="bg-gradient-primary p-2 rounded-lg">
            <FileCheck className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg md:text-2xl font-semibold md:font-bold text-foreground">
              StatementSync
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground">
              Financial Audit Dashboard
            </p>
          </div>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleNavigateToHistory}
          >
            <HistoryIcon className="h-4 w-4" />
            Records
          </Button>
          <div className="flex items-center space-x-2 text-muted-foreground">
            <User className="h-4 w-4" />
            <span className="text-sm text-ellipsis text-nowrap">
              {user?.name}
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>

        {/* Mobile Hamburger Menu */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <SheetHeader>
                <SheetTitle className="text-left">Menu</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col space-y-4 mt-6">
                {/* User Info */}
                <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{user?.name}</p>
                    <p className="text-sm text-muted-foreground">User Account</p>
                  </div>
                </div>

                {/* Navigation Items */}
                <div className="space-y-2">
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={handleNavigateToHistory}
                  >
                    <HistoryIcon className="h-4 w-4 mr-3" />
                    Records
                  </Button>
                  
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-destructive hover:text-destructive"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4 mr-3" />
                    Logout
                  </Button>
                </div>

                {/* App Info */}
                <div className="mt-8 pt-4 border-t border-border">
                  <div className="flex items-center space-x-2 text-muted-foreground">
                    <FileCheck className="h-4 w-4" />
                    <span className="text-sm">StatementSync v1.0</span>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};