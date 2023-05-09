import React, { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { useObservable, unwrap } from "#src";

const obj = {
  name: "Alex",
  age: 39,
  movies: [
    { id: 1, title: "Batman", music: "Danny Elfman" },
    { id: 2, title: "Star Wars", music: "John Williams" },
  ],
  books: [
    { id: 1, title: "Harry Potter", author: "JK Rowling" },
    { id: 2, title: "Book2", author: "Anonymous" },
  ],
};

function NameAge() {
  const { store, observe, unobserve } = useObservable(obj);

  const renderCount = useRef(0);
  renderCount.current++;

  const [showAge, setShowAge] = useState(false);

  unwrap(store.movies);

  console.log(store.movies);

  useEffect(() => {
    console.log("movies changed");
  }, [store.movies]);

  useEffect(() => {
    console.log("books changed");
  }, [store.books]);

  return (
    <div>
      <div>NameAge</div>
      <div>Render count: {renderCount.current}</div>
      <div>Movies: {store.movies.length}</div>

      <div>{store.name}</div>
      <input value={store.name} onChange={(e) => (store.name = e.target.value)} />

      {showAge && <div>{store.age}</div>}

      <div>
        <input
          type="checkbox"
          checked={showAge}
          onChange={() => {
            setShowAge((store) => !store);
          }}
        />
      </div>

      <div>
        <button
          onClick={() => {
            store.age++;
          }}
        >
          Grow
        </button>
      </div>
    </div>
  );
}

function Movie(props: { movieIndex: number }) {
  const { movieIndex } = props;
  const { store } = useObservable(obj);

  const movie = store.movies[movieIndex];

  const renderCount = useRef(0);
  renderCount.current++;

  return (
    <div>
      <hr />
      <div>Movie</div>
      <div>Render count: {renderCount.current}</div>

      <input
        value={movie.title}
        onChange={(e) => {
          movie.title = e.target.value;
        }}
      />
      <button
        onClick={() => {
          console.log("start splice", movieIndex);
          store.movies.splice(movieIndex, 1);
          console.log("end splice", store.movies);
        }}
      >
        X
      </button>

      {/*<input*/}
      {/*  value={movie.music}*/}
      {/*  onChange={(e) => {*/}
      {/*    movie.music = e.target.value;*/}
      {/*  }}*/}
      {/*/>*/}
    </div>
  );
}

let movieI = 0;

function Movies() {
  const { store } = useObservable(obj);

  const { movies } = store;

  const renderCount = useRef(0);
  renderCount.current++;

  return (
    <div>
      <hr />
      <div>Movies</div>

      <div>Render count: {renderCount.current}</div>

      {movies.map((movie, i) => {
        return <Movie key={movie.id} movieIndex={i} />;
      })}

      <button
        onClick={() =>
          store.movies.push({
            id: Math.random() * 1000000,
            title: `New Movie ${movieI++}`,
            music: "New Music",
          })
        }
      >
        Add Movie
      </button>

      {/*<pre>{JSON.stringify(movies, null, 2)}</pre>*/}
    </div>
  );
}

function Book(props: { bookIndex: number }) {
  const { bookIndex } = props;
  const { store } = useObservable(obj);

  const book = store.books[bookIndex];

  const renderCount = useRef(0);
  renderCount.current++;

  return (
    <div>
      <hr />
      <div>Books</div>
      <div>Render count: {renderCount.current}</div>

      <input
        value={book.title}
        onChange={(e) => {
          book.title = e.target.value;
        }}
      />

      {/*<input*/}
      {/*  value={books.music}*/}
      {/*  onChange={(e) => {*/}
      {/*    books.music = e.target.value;*/}
      {/*  }}*/}
      {/*/>*/}
    </div>
  );
}

function Books() {
  const {
    store: { books },
  } = useObservable(obj);

  const renderCount = useRef(0);
  renderCount.current++;

  return (
    <div>
      <hr />
      <div>Books</div>
      <div>Render count: {renderCount.current}</div>

      <div>Count: {books.length}</div>

      {books.map((book, i) => {
        return <Book key={book.id} bookIndex={i} />;
      })}

      {/*<pre>{JSON.stringify(books, null, 2)}</pre>*/}
    </div>
  );
}

function App() {
  return (
    <div>
      <NameAge />
      <Movies />
      <Books />
    </div>
  );
}

const profile = {
  editing: false,
  name: "Jimmy",
  email: "jimmy@email.com",
  address: "123 Main St.",
  things: new Set(["a", "b", "c"]),
};

function Profile() {
  const { store } = useObservable(profile);
  return store.editing ? <ProfileEditor /> : <ProfileViewer />;
}

function ProfileEditor() {
  const { store } = useObservable(profile);
  return (
    <div>
      <input
        value={store.name}
        onChange={(e) => {
          store.name = e.target.value;
        }}
      />
      <input
        value={store.email}
        onChange={(e) => {
          store.email = e.target.value;
        }}
      />
      <textarea
        value={store.address}
        onChange={(e) => {
          store.address = e.target.value;
        }}
      />
      {[...store.things].map((thing) => (
        <div>{thing}</div>
      ))}
      <button
        onClick={() => {
          // store.editing = false;
          store.things.add(Math.random() + "");
        }}
      >
        Save
      </button>
    </div>
  );
}

function ProfileViewer() {
  const { store } = useObservable(profile);
  return (
    <div>
      <h1>{store.name}</h1>
      <p>{store.email}</p>
      <p>{store.address}</p>
      <button
        onClick={() => {
          store.editing = true;
        }}
      >
        Edit
      </button>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
