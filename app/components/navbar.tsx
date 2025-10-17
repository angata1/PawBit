import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu"
import Link from "next/link"

export default function NavBar() {
  return (
    <header className="w-full border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
        {/* Logo / Brand */}
        <Link href="/" className="text-xl font-bold text-primary">
          PawBit
        </Link>

        {/* Navigation */}
        <NavigationMenu>
          <NavigationMenuList className="flex flex-row gap-6">
            <NavigationMenuItem>
              <NavigationMenuLink
                href="/"
                className="px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                Начало
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink
                href="/about"
                className="px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                За нас
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink
                href="/donate"
                className="px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                Дари
              </NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>
    </header>
  )
}
