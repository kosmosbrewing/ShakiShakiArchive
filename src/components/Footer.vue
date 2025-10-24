<script setup lang="ts">
import Separator from "./ui/separator/Separator.vue";
</script>

<template>
  <footer id="footer" class="container py-24 pb-16 sm:py-32 sm:pb-24">
    <div class="p-10 bg-white dark:bg-white border rounded-2xl">
      <div
        class="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-x-12 gap-y-8"
      >
        <div class="col-span-full xl:col-span-2">
          <a href="#" class="flex font-bold items-center">
            <img src="@/icons/logo06.png" alt="Logo" class="h-10 w-18" />
          </a>
        </div>
      </div>

      <Separator class="my-6" />
      <section class="">
        <h6 class="">
          루옥(RUOK) 부산광역시 부산진구 전포대로 260 1층 010 2357 3345 Business
          License : 680-79-00404 Mail order license: 신고중 CEO : 강은혜
        </h6>
      </section>
    </div>
  </footer>
</template>
