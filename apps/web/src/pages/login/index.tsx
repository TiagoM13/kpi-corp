import { BrandPanel } from "@/components/brand-panel";
import { LoginForm } from "./components/login-form";

export function LoginPage() {
	return (
		<div className="grid min-h-svh lg:grid-cols-auth">
			<BrandPanel />
			<LoginForm />
		</div>
	);
}
