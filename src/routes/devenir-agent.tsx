import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/devenir-agent")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/devenir-agent"!</div>;
}
