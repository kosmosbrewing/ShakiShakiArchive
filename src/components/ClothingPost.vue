<template>
  <div class="clothing-post">
    <h2>옷 게시하기</h2>

    <form @submit.prevent="addClothing">
      <div>
        <label for="name">옷 이름:</label>
        <input type="text" id="name" v-model="newClothing.name" required />
      </div>

      <div>
        <label for="category">카테고리:</label>
        <select id="category" v-model="newClothing.category" required>
          <option disabled value="">선택하세요</option>
          <option>상의</option>
          <option>하의</option>
          <option>아우터</option>
          <option>신발</option>
          <option>악세사리</option>
        </select>
      </div>

      <div>
        <label for="price">가격:</label>
        <input
          type="number"
          id="price"
          v-model.number="newClothing.price"
          min="0"
          required
        />
      </div>

      <div>
        <label for="description">설명:</label>
        <textarea id="description" v-model="newClothing.description"></textarea>
      </div>

      <button type="submit">게시하기</button>
    </form>

    <h3>게시된 옷 목록</h3>
    <ul>
      <li v-for="(cloth, index) in clothings" :key="index">
        <strong>{{ cloth.name }}</strong> ({{ cloth.category }}) -
        {{ cloth.price }} 원
        <p>{{ cloth.description }}</p>
      </li>
    </ul>
  </div>
</template>

<script>
export default {
  name: "ClothingPost",
  data() {
    return {
      newClothing: {
        name: "",
        category: "",
        price: null,
        description: "",
      },
      clothings: [],
    };
  },
  methods: {
    addClothing() {
      if (
        this.newClothing.name &&
        this.newClothing.category &&
        this.newClothing.price !== null
      ) {
        this.clothings.push({ ...this.newClothing });
        // 초기화
        this.newClothing = {
          name: "",
          category: "",
          price: null,
          description: "",
        };
      } else {
        alert("필수 항목을 모두 입력해주세요.");
      }
    },
  },
};
</script>

<style scoped>
.clothing-post {
  max-width: 400px;
  margin: 0 auto;
}
form div {
  margin-bottom: 10px;
}
label {
  display: block;
  font-weight: bold;
}
input,
select,
textarea {
  width: 100%;
  padding: 6px;
  box-sizing: border-box;
}
button {
  padding: 8px 12px;
  background-color: #3a86ff;
  color: white;
  border: none;
  cursor: pointer;
}
button:hover {
  background-color: #265ddb;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  margin-bottom: 15px;
  border-bottom: 1px solid #ccc;
  padding-bottom: 10px;
}
</style>
