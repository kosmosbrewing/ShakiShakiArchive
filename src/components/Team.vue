<script setup lang="ts">
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";

interface TeamProps {
  imageUrl: string;
  firstName: string;
  lastName: string;
  price: string[];
}

const teamList: TeamProps[] = [
  {
    imageUrl: "https://i.pravatar.cc/250?img=58",
    firstName: "Leo",
    lastName: "Miranda",
    price: ["Vue Fronted Developer", "Creator Of This Website"],
  },
  {
    imageUrl:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1528&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    firstName: "Elizabeth",
    lastName: "Moore",
    price: ["UI/UX Designer"],
  },
  {
    imageUrl:
      "https://images.unsplash.com/photo-1527980965255-d3b416303d12?q=80&w=1760&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    firstName: "David",
    lastName: "Diaz",
    price: ["Machine Learning Engineer", "TensorFlow Tinkerer"],
  },
  {
    imageUrl:
      "https://images.unsplash.com/photo-1573497161161-c3e73707e25c?q=80&w=1587&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    firstName: "Sarah",
    lastName: "Robinson",
    price: ["Cloud Native Developer", " Kubernetes Orchestrator"],
  },
  {
    imageUrl:
      "https://images.unsplash.com/photo-1616805765352-beedbad46b2a?q=80&w=1887&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    firstName: "Michael",
    lastName: "Holland",
    price: ["DevOps Engineer", "CI/CD Pipeline Mastermind"],
  },
  {
    imageUrl:
      "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?q=80&w=1587&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    firstName: "Zoe",
    lastName: "Garcia",
    price: ["JavaScript Evangelist", "Deno Champion"],
  },
  {
    imageUrl:
      "https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=1480&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    firstName: "Evan",
    lastName: "James",
    price: ["Backend Developer"],
  },
  {
    imageUrl:
      "https://images.unsplash.com/photo-1573497019236-17f8177b81e8?q=80&w=1740&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3Dhttps://images.unsplash.com/photo-1573497019236-17f8177b81e8?q=80&w=1740&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    firstName: "Pam",
    lastName: "Taylor",
    price: ["Fullstack developer", "UX Researcher"],
  },
];
</script>

<template>
  <section id="team" class="container lg:w-[75%] py-24 sm:py-32">
    <div
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
    >
      <Card
        v-for="{ imageUrl, firstName, lastName, price } in teamList"
        :key="imageUrl"
        class="bg-muted/60 dark:bg-card flex flex-col h-full overflow-hidden group/hoverimg"
      >
        <CardHeader class="p-0 gap-0">
          <div class="h-full overflow-hidden">
            <img
              :src="imageUrl"
              alt=""
              class="w-full aspect-square object-cover saturate-0 transition-all duration-200 ease-linear size-full group-hover/hoverimg:saturate-100 group-hover/hoverimg:scale-[1.01]"
            />
          </div>
          <CardContent class="py-6 pb-4 px-6">{{ firstName }} </CardContent>
        </CardHeader>

        <CardContent
          v-for="(position, index) in price"
          :key="index"
          :class="{
            'pb-0 text-muted-foreground ': true,
            'pb-4': index === price.length - 1,
          }"
        >
          {{ position }}<span v-if="index < price.length - 1">,</span>
        </CardContent>
      </Card>
    </div>
  </section>
</template>
