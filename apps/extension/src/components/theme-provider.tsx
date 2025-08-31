import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useEffect, useState } from "react";
import { getConfig } from "../services/storage";

type ThemeProviderProps = React.ComponentProps<typeof NextThemesProvider>;

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const [mounted, setMounted] = useState(false);
  const [initialTheme, setInitialTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const config = await getConfig();
        setInitialTheme(config.theme || "light");
      } catch (error) {
        console.error("Error loading theme from storage:", error);
      } finally {
        setMounted(true);
      }
    };

    loadTheme();
  }, []);

  // Prevent hydration mismatch by not rendering until theme is loaded
  if (!mounted) {
    return null;
  }

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={initialTheme}
      disableTransitionOnChange
      enableSystem={false}
      storageKey="extension-theme" // Use a custom storage key to avoid conflicts
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
