import { Text } from "@nicolassancho/storybook-core";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 px-6">
      <Text as="h1" size="heading" weight="semibold">
        Counthouse
      </Text>
      <Text size="large" color="primary">
        Back office
      </Text>
    </main>
  );
}
