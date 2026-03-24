<template>
  <section class="grid gap-2.5">
    <div class="flex items-center justify-between gap-4">
      <div class="flex items-center gap-2.5">
        <RouterLink
          to="/"
          aria-label="Back to books"
          class="grid size-9 place-items-center rounded-xl border border-[#46569929] bg-[linear-gradient(180deg,#ffffff,#f7f9ff)] text-base font-extrabold text-[#2b355f] no-underline shadow-[0_8px_18px_rgba(52,58,87,0.12)] active:translate-y-px"
        >
          <span aria-hidden="true">&larr;</span>
        </RouterLink>
        <div>
          <p class="mb-0.5 text-[0.7rem] uppercase tracking-[0.12em] text-[#916f22]">Current book</p>
          <h1 class="m-0 text-[1.05rem]">{{ book.name }}</h1>
        </div>
      </div>

      <button
        v-if="showAction"
        class="h-9 w-9 rounded-xl border-0 text-[1.2rem] text-white shadow-[0_12px_20px_rgba(67,97,216,0.25)] [background:linear-gradient(135deg,#4361d8,#5a7cff)]"
        type="button"
        @click="$emit('toggle-actions')"
      >
        +
      </button>
    </div>

    <slot />
  </section>
</template>

<script setup>
defineProps({
  book: {
    type: Object,
    required: true,
  },
  recordCount: {
    type: Number,
    required: true,
  },
  showAction: {
    type: Boolean,
    default: true,
  },
})

defineEmits(['toggle-actions'])
</script>
