import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleTheme}
      className="h-8 w-8 px-0 transition-colors duration-200"
    >
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all duration-300 ease-in-out dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all duration-300 ease-in-out dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

export function ThemeToggleWithLabel() {
  const { setTheme, theme } = useTheme();

  const handleLightClick = () => setTheme("light");
  const handleDarkClick = () => setTheme("dark");

  return (
    <div className="flex items-center space-x-1 border rounded-md p-1 transition-colors duration-200">
      <Button
        variant={theme === "light" ? "default" : "ghost"}
        size="sm"
        onClick={handleLightClick}
        className="h-6 px-2 text-xs transition-all duration-200 ease-in-out"
      >
        <Sun className="h-3 w-3 mr-1 transition-all duration-200" />
        Light
      </Button>
      <Button
        variant={theme === "dark" ? "default" : "ghost"}
        size="sm"
        onClick={handleDarkClick}
        className="h-6 px-2 text-xs transition-all duration-200 ease-in-out"
      >
        <Moon className="h-3 w-3 mr-1 transition-all duration-200" />
        Dark
      </Button>
    </div>
  );
}
