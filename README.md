# Party Games Hub 🎮

A fully online multiplayer party game collection that you can play with friends in real-time!

## 🎯 Games Included

1. **Guess the Commenter** 🎭 - Submit anonymous responses and guess who said what
2. **The Imposter** 🕵️ - Find the player who doesn't know the secret word
3. **Two Truths & A Lie** 🤔 - Spot the false statement among three
4. **Wavelength** 🌊 - Sync with your team on a spectrum
5. **Story Chain Chaos** 📖 - Build a story with hidden secret words
6. **Alibi** ⚖️ - Create matching alibis to avoid being found guilty
7. **Quick Draw Telephone** ✏️ - Draw and describe in a hilarious chain

## 🚀 Quick Start (3 Steps!)

### Step 1: Set Up Firebase (5 minutes, FREE)

The game uses Firebase for online multiplayer. Follow the **FIREBASE_SETUP.md** guide to:
1. Create a free Firebase project
2. Enable Realtime Database
3. Copy your config into `gameState.js`

**This is a one-time setup and completely free!**

### Step 2: Upload to a Host

Choose any free hosting service:

#### **GitHub Pages** (Easiest)
1. Create a GitHub account
2. Create a new repository
3. Upload all files
4. Go to Settings > Pages
5. Select main branch and save
6. Your game is live at `https://yourusername.github.io/repository-name`

#### **Netlify** (Drag & Drop)
1. Go to https://www.netlify.com
2. Sign up for free
3. Drag and drop your folder
4. Get instant hosting

#### **Vercel** (Fast)
1. Go to https://vercel.com
2. Sign up and connect GitHub
3. Deploy in one click

### Step 3: Play!

1. **Create a Room**: First player clicks "Create Room"
2. **Share Code**: Share the 4-letter code with friends
3. **Join Room**: Friends enter the code and their names
4. **Pick a Game**: Host chooses which game to play
5. **Have Fun!** 🎉

## 🎨 Features

- ✅ Real-time online multiplayer
- ✅ No login required - just room codes
- ✅ 7 different party games
- ✅ Beautiful, modern UI with smooth animations
- ✅ Works on desktop and mobile
- ✅ 3-12 players depending on the game
- ✅ FREE to host and play
- ✅ Host controls for managing games

## 🎮 Game Requirements

- **Guess the Commenter**: 3-10 players
- **The Imposter**: 4-8 players
- **Two Truths & A Lie**: 3-10 players
- **Wavelength**: 4-12 players
- **Story Chain Chaos**: 3-8 players
- **Alibi**: 4-8 players
- **Quick Draw Telephone**: 4-10 players

## 💡 Tips

- Use a larger screen for drawing games
- Make sure everyone is on the same page before starting
- The host has control over game flow
- You can leave and rejoin rooms using the same code
- Each game explains the rules as you play

## 🛠️ Technical Details

Built with:
- Pure HTML, CSS, and JavaScript
- Firebase Realtime Database for multiplayer
- No frameworks required
- Responsive design for all devices

## 📝 Files Included

- `index.html` - Main game page
- `styles.css` - Beautiful styling
- `main.js` - Navigation and UI logic
- `gameState.js` - Firebase multiplayer system
- `games/` - Individual game files
  - `guessCommenter.js`
  - `imposter.js`
  - `twoTruths.js`
  - `wavelength.js`
  - `storyChain.js`
  - `alibi.js`
  - `quickDraw.js`
- `FIREBASE_SETUP.md` - Detailed Firebase setup guide
- `README.md` - This file

## ❓ Troubleshooting

**"Failed to create room"**
- Make sure you've set up Firebase (see FIREBASE_SETUP.md)
- Check that your config in gameState.js is correct
- Verify you have internet connection

**Players can't join**
- Make sure you're sharing the correct 4-letter code
- Check that everyone is using the same website URL
- Verify Firebase database rules are set correctly

**Game is laggy**
- Check internet connection
- Try refreshing the page
- Make sure Firebase database is in your region

## 🎉 Have Fun!

Gather your friends, create a room, and enjoy these party games together!

---

Made with ❤️ for fun times with friends