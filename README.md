# UNIX Inode File System Simulator 🖥️📁

Welcome to this interactive visualization of how UNIX-like file systems use inodes to manage files! This simulator helps you understand the magic behind file storage in systems like Linux and macOS.

## 🌟 What's This All About?
Ever wondered how your computer keeps track of all your files? This project demonstrates the elegant inode-based system that powers UNIX file systems:

- Visualize how files are stored across disk blocks
- Understand direct, indirect, and multi-level block pointers
- Experiment with file creation and see the real-time effects

## 🚀 Quick Start
1. Open `index.html` in your favorite browser.
2. Initialize the file system by clicking the button.
3. Create files by entering a name and size.
4. Explore the inode details when you select a file.

## 🧠 Key Concepts Illustrated
### 🔹 Inode Structure
- **12 Direct Blocks**: Fast access to the first chunks of data.
- **Single Indirect Block**: Points to 256 additional blocks.
- **Double Indirect Block**: Two levels of indirection for huge files.
- **Triple Indirect Block**: Three levels for massive files.

### 🎨 Color Coding
- 🟩 **Green**: Direct data blocks
- 🟦 **Blue**: Single indirect pointer blocks
- 🟪 **Purple**: Double indirect pointer blocks
- 🟧 **Orange**: Triple indirect pointer blocks
- ⬜ **Gray**: Free blocks

## 💡 Learning Opportunities
This project is perfect for:
- 🏫 **CS students** learning about file systems
- 🛠️ **Developers** curious about low-level storage
- 💾 **Anyone** who wants to understand how files are organized

## 🛠️ Technical Details
- **Pure HTML/CSS/JS** - No frameworks, no build steps
- **Interactive Visualization** - See changes in real-time
- **Educational Tooltips** - Hover over blocks for details

## 🤝 How You Can Contribute
Found a bug? Have an improvement idea?

1. **Fork the repository**
2. **Create your feature branch** (`git checkout -b feature-name`)
3. **Commit your changes** (`git commit -m 'Add some feature'`)
4. **Push to the branch** (`git push origin feature-name`)
5. **Submit a pull request**

## 📜 License
This project is open source under the MIT License - feel free to use it for learning, teaching, or even as a base for your own projects!

---

Happy exploring! May your inodes never get corrupted 😉
