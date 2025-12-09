#!/bin/bash

# Logistic Warehouse Dependencies Installation Script
# Make sure to run this script in your project root directory

echo "🚀 Starting Logistic Warehouse dependencies installation..."

# Step 1: Install Core Dependencies
echo "📦 Installing core React dependencies..."
npm install react react-dom
npm install -D @types/react @types/react-dom typescript

# Step 2: Setup Tailwind CSS
echo "🎨 Setting up Tailwind CSS..."
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npm install -D tailwindcss-animate
npm install clsx tailwind-merge class-variance-authority

# Step 3: State Management & Data Fetching
echo "📊 Installing state management and data fetching libraries..."
npm install zustand immer
npm install @tanstack/react-query @tanstack/react-table @tanstack/react-virtual
npm install -D @tanstack/react-query-devtools

# Step 4: Visualization Libraries
echo "📈 Installing visualization libraries..."
npm install chart.js react-chartjs-2 chartjs-plugin-datalabels chartjs-plugin-zoom
npm install three @react-three/fiber @react-three/drei
npm install -D @types/three

# Step 5: Routing & Forms
echo "🔀 Installing routing and form libraries..."
npm install react-router-dom
npm install -D @types/react-router-dom
npm install react-hook-form @hookform/resolvers zod

# Step 6: Utility Libraries
echo "🛠️ Installing utility libraries..."
npm install date-fns react-day-picker
npm install lucide-react @radix-ui/react-icons
npm install react-dropzone xlsx file-saver
npm install -D @types/file-saver
npm install jspdf html2canvas
npm install -D @types/jspdf
npm install react-barcode qrcode.react
npm install lodash uuid axios
npm install -D @types/lodash @types/uuid

# Step 7: AI/Chat Related
echo "🤖 Installing AI/Chat related dependencies..."
npm install react-markdown remark-gfm react-syntax-highlighter
npm install -D @types/react-syntax-highlighter
npm install socket.io-client

# Step 8: Animation Libraries
echo "✨ Installing animation libraries..."
npm install framer-motion react-intersection-observer react-use-measure

# Step 9: Development Tools
echo "🔧 Installing development tools..."
npm install -D @vitejs/plugin-react
npm install -D eslint eslint-plugin-react-hooks
npm install -D prettier
npm install -D @typescript-eslint/parser @typescript-eslint/eslint-plugin
npm install -D dotenv

# Step 10: Optional Testing Libraries
echo "🧪 Installing testing libraries (optional)..."
read -p "Do you want to install testing libraries? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    npm install -D vitest @testing-library/react
    npm install -D @testing-library/jest-dom @testing-library/user-event
    npm install -D jsdom
fi

# Step 11: Setup shadcn-ui
echo "🎯 Setting up shadcn-ui..."
echo "Please run the following command manually and follow the prompts:"
echo "npx shadcn-ui@latest init"
echo ""
echo "After initialization, run this command to install all components:"
echo "npx shadcn-ui@latest add button card dialog sheet table tabs input select checkbox radio-group alert alert-dialog badge toast dropdown-menu navigation-menu skeleton separator scroll-area form label textarea switch command popover tooltip avatar breadcrumb progress"

# Create necessary directories
echo "📁 Creating project structure..."
mkdir -p src/components/ui
mkdir -p src/components/layout
mkdir -p src/components/dashboard
mkdir -p src/components/ai
mkdir -p src/pages
mkdir -p src/hooks
mkdir -p src/lib
mkdir -p src/store
mkdir -p src/services
mkdir -p src/types
mkdir -p src/assets

# Create .env.example file
echo "📝 Creating .env.example file..."
cat > .env.example << EOL
VITE_API_URL=http://localhost:3000/api
VITE_WS_URL=ws://localhost:3000
VITE_AI_API_KEY=your-api-key-here
EOL

# Create .prettierrc file
echo "💅 Creating .prettierrc file..."
cat > .prettierrc << EOL
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
EOL

# Update package.json scripts
echo "📋 Updating package.json scripts..."
npm pkg set scripts.dev="vite"
npm pkg set scripts.build="tsc && vite build"
npm pkg set scripts.lint="eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0"
npm pkg set scripts.preview="vite preview"
npm pkg set scripts.format="prettier --write ."
npm pkg set scripts.type-check="tsc --noEmit"

echo "✅ Installation complete!"
echo ""
echo "⚠️  Don't forget to:"
echo "1. Run 'npx shadcn-ui@latest init' and follow the prompts"
echo "2. Install shadcn-ui components with the command shown above"
echo "3. Copy .env.example to .env and update with your values"
echo "4. Update tailwind.config.js with the configuration from README"
echo "5. Update src/index.css with Tailwind directives"
echo ""
echo "🚀 Run 'npm run dev' to start the development server!"