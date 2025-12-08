<script setup lang="ts">
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface TeamProps {
  imageUrl: string;
  productName: string;
  price: string[];
}

const teamList: TeamProps[] = [
  {
    imageUrl:
      "https://cafe24.poxo.com/ec01/smarturbanuseful/Eq2JUnbp+f2xrJOy4N2kk1EfH+p/G7NSEh2JMOVkxffHPUsKK8fzGm4WGv9Rxfqwocswg1D2inUt3CtaaD935A==/_/web/product/medium/202508/e264c47b7c46b3d5b979178ad1020dfc.png",
    productName: "ROUND COLLAR SUEDE JACKET CHARCOAL",
    price: ["288,000원"],
  },
  {
    imageUrl:
      "https://cafe24.poxo.com/ec01/smarturbanuseful/Eq2JUnbp+f2xrJOy4N2kk1EfH+p/G7NSEh2JMOVkxffHPUsKK8fzGm4WGv9Rxfqwocswg1D2inUt3CtaaD935A==/_/web/product/medium/202508/a7afb8743e5c273e2637ba2d922f7bda.png",
    productName: "COZY SWEAT JACKET MELANGE GREY",
    price: ["173,000원"],
  },
  {
    imageUrl:
      "https://cafe24.poxo.com/ec01/smarturbanuseful/Eq2JUnbp+f2xrJOy4N2kk1EfH+p/G7NSEh2JMOVkxffHPUsKK8fzGm4WGv9Rxfqwocswg1D2inUt3CtaaD935A==/_/web/product/medium/202508/e5f1e9888a7f9bf0eba9a2b0638e4a07.png",
    productName: "COZY SWEAT WRAP SKIRT MELANGE GREY",
    price: ["143,000원"],
  },
  {
    imageUrl:
      "https://cafe24.poxo.com/ec01/smarturbanuseful/Eq2JUnbp+f2xrJOy4N2kk1EfH+p/G7NSEh2JMOVkxffHPUsKK8fzGm4WGv9Rxfqwocswg1D2inUt3CtaaD935A==/_/web/product/medium/202508/774729110d59ff1ccc30f2388d105e54.png",
    productName: "COTTON CUDDLE LONGSLEEVES NAVY",
    price: ["108,000원"],
  },
];
</script>

<template>
  <section id="team" class="container">
    <div
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
    >
      <Card
        v-for="{ imageUrl, productName, price } in teamList"
        :key="imageUrl"
        class="bg-muted/5 flex flex-col h-full overflow-hidden group/hoverimg"
      >
        <CardHeader class="p-0 gap-0">
          <div class="h-full overflow-hidden">
            <img
              :src="imageUrl"
              alt=""
              class="w-full aspect-square object-cover saturate-0 transition-all duration-200 ease-linear size-full group-hover/hoverimg:saturate-100 group-hover/hoverimg:scale-[1.01]"
            />
          </div>
          <CardContent class="text-sm py-6 pb-1 px-6"
            >{{ productName }}
          </CardContent>
        </CardHeader>

        <CardContent
          v-for="(position, index) in price"
          :key="index"
          :class="{
            'pb-0 text-sm text-muted-foreground ': true,
            'pb-4': index === price.length - 1,
          }"
        >
          {{ position }}<span v-if="index < price.length - 1">,</span>
        </CardContent>
      </Card>
    </div>
  </section>
</template>
