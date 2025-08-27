import  { useState } from "react";
import { Link } from "react-router-dom";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
	NavigationMenu,
	NavigationMenuItem,
	NavigationMenuList,
	navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import { Menu, X, Twitter, Zap } from "lucide-react";

const Navbar = () => {
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

	const NavLinks = () => (
		<>
			<NavigationMenuItem>
				<Link
					to="/"
					className={navigationMenuTriggerStyle() + " text-sm font-medium transition-colors duration-200"}
					onClick={() => setIsMobileMenuOpen(false)}
				>
					Dashboard
				</Link>
			</NavigationMenuItem>
			<NavigationMenuItem>
				<Link
					to="/create"
					className={navigationMenuTriggerStyle() + " text-sm font-medium transition-colors duration-200"}
					onClick={() => setIsMobileMenuOpen(false)}
				>
					Create
				</Link>
			</NavigationMenuItem>
			<NavigationMenuItem>
				<a
					href="https://zealous-rook-259.notion.site/Synthra-2569062b846880109610d9455129ae79"
					target="_blank"
					rel="noopener noreferrer"
					className={navigationMenuTriggerStyle() + " text-sm font-medium transition-colors duration-200"}
					onClick={() => setIsMobileMenuOpen(false)}
				>
					Docs
				</a>
			</NavigationMenuItem>
		</>
	);

	return (
		<nav className="sticky px-5 top-0 w-full z-40 border-b border-border/40 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/80 text-foreground">
			<div className="container flex h-16 items-center">
				{/* Logo */}
				<div className="mr-4 md:mr-8">
					<Link to="/" className="flex items-center space-x-2 group">
						<div className="p-1.5 rounded-lg bg-gradient-to-r from-primary to-primary/80 group-hover:sei-glow transition-all duration-300">
							<Zap className="h-5 w-5 text-primary-foreground" />
						</div>
						<h1 className="text-lg md:text-xl font-bold sei-text-gradient">
							Synthra
						</h1>
					</Link>
				</div>

				{/* Desktop Navigation */}
				<NavigationMenu className="hidden md:flex">
					<NavigationMenuList className="space-x-1">
						<NavLinks />
					</NavigationMenuList>
				</NavigationMenu>

				{/* Mobile Menu Button */}
				<Button
					variant="ghost"
					size="icon"
					className="md:hidden mr-2 hover:bg-secondary/50 transition-all duration-200"
					onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
				>
					{isMobileMenuOpen ? (
						<X className="h-5 w-5" />
					) : (
						<Menu className="h-5 w-5" />
					)}
				</Button>

				{/* Social and Connect Button */}
				<div className="flex flex-1 items-center justify-end space-x-4">
					<a
						href="https://x.com/synthra"
						target="_blank"
						rel="noopener noreferrer"
						className="p-2 rounded-lg hover:bg-secondary/50 transition-all duration-200 group"
					>
						<Twitter className="h-5 w-5 group-hover:text-primary transition-colors" />
					</a>
					<div className="rounded-lg border border-border/50">
						<ConnectButton />
					</div>
				</div>
			</div>

			{/* Mobile Navigation Menu */}
			{isMobileMenuOpen && (
				<div className="md:hidden border-t border-border/40 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
					<NavigationMenu className="container py-4">
						<NavigationMenuList className="flex flex-col space-y-2">
							<NavLinks />
						</NavigationMenuList>
					</NavigationMenu>
				</div>
			)}
		</nav>
	);
};

export default Navbar;
