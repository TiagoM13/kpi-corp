import { BrandPanel } from "@/components/brand-panel";
import { LoginForm } from "./components/login-form";

export function LoginPage() {
	return (
		<div className="grid min-h-svh lg:grid-cols-[1fr_1.1fr]">
			<BrandPanel />
			<LoginForm />
		</div>
	);
}
