// Đăng nhập Google + lưu dữ liệu trên Firestore. Gắn API vào window.PDCloud cho các trang dùng.
// Cấu hình Firebase là thông tin công khai theo thiết kế; việc bảo vệ dữ liệu nằm ở Firestore Security Rules
// (chỉ cho đúng tài khoản Google của chủ web đọc/ghi).
import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js';
import {
  getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut,
} from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, setDoc, deleteDoc, onSnapshot, writeBatch, getDocs,
} from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyAUK2sYzDruluuJZVv7l4F2Al0h1-SGuYw',
  authDomain: 'pd-budgeting.firebaseapp.com',
  projectId: 'pd-budgeting',
  storageBucket: 'pd-budgeting.firebasestorage.app',
  messagingSenderId: '309204035144',
  appId: '1:309204035144:web:a4472e4aa69c45d8e55a7d',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
// Có bộ nhớ đệm ngoại tuyến: vẫn xem/ghi được khi mất mạng, tự đồng bộ lại khi có mạng
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

const BATCH = 400; // Firestore cho tối đa 500 thao tác mỗi batch

async function commitInChunks(ops) {
  for (let i = 0; i < ops.length; i += BATCH) {
    const batch = writeBatch(db);
    ops.slice(i, i + BATCH).forEach((fn) => fn(batch));
    await batch.commit();
  }
}

window.PDCloud = {
  onUser: (cb) => onAuthStateChanged(auth, cb),
  signIn() {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    return signInWithPopup(auth, provider);
  },
  signOut: () => signOut(auth),

  /** Theo dõi realtime một collection. cb nhận mảng [{ id, ...dữ liệu }] */
  watch(col, cb, onError) {
    return onSnapshot(
      collection(db, col),
      (snap) => cb(snap.docs.map((d) => ({ ...d.data(), id: d.id }))),
      (err) => onError && onError(err),
    );
  },
  put: (col, id, data) => setDoc(doc(db, col, id), data),
  remove: (col, id) => deleteDoc(doc(db, col, id)),
  /** items: [{ id, data }] */
  putMany: (col, items) => commitInChunks(items.map((it) => (b) => b.set(doc(db, col, it.id), it.data))),
  /** Thay toàn bộ collection bằng items: xoá doc không còn, ghi lại phần còn lại */
  async replaceAll(col, items) {
    const keep = new Set(items.map((it) => it.id));
    const existing = await getDocs(collection(db, col));
    const ops = [];
    existing.docs.forEach((d) => { if (!keep.has(d.id)) ops.push((b) => b.delete(d.ref)); });
    items.forEach((it) => ops.push((b) => b.set(doc(db, col, it.id), it.data)));
    await commitInChunks(ops);
  },
};
