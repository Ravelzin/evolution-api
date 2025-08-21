const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Install Whatsmeow WASM integration
 */
async function installWhatsmeowWasm() {
  console.log('🚀 Installing Whatsmeow WASM integration...\n');

  const whatsmeowPath = path.join(__dirname, '..', '..', 'whatsmeow');
  const evolutionWasmPath = path.join(__dirname, '..', 'src', 'integrations', 'whatsmeow', 'wasm');

  try {
    // Step 1: Check if Go is installed
    console.log('1. Checking Go installation...');
    try {
      const goVersion = execSync('go version', { encoding: 'utf8' });
      console.log(`   ✅ ${goVersion.trim()}`);
    } catch (error) {
      throw new Error('Go is not installed. Please install Go from https://golang.org/dl/');
    }

    // Step 2: Check if whatsmeow directory exists
    console.log('\n2. Checking whatsmeow directory...');
    if (!fs.existsSync(whatsmeowPath)) {
      throw new Error(`Whatsmeow directory not found at ${whatsmeowPath}`);
    }
    console.log(`   ✅ Found at ${whatsmeowPath}`);

    // Step 3: Build WASM module
    console.log('\n3. Building Whatsmeow WASM module...');
    
    // Check if build script exists
    const buildScriptPath = path.join(whatsmeowPath, 'build-wasm.ps1');
    if (!fs.existsSync(buildScriptPath)) {
      throw new Error(`Build script not found at ${buildScriptPath}`);
    }

    // Execute build script
    process.chdir(whatsmeowPath);
    
    const buildCommand = process.platform === 'win32' 
      ? 'powershell -ExecutionPolicy Bypass -File build-wasm.ps1'
      : 'bash build-wasm.sh';
    
    console.log(`   Executing: ${buildCommand}`);
    execSync(buildCommand, { stdio: 'inherit' });

    // Step 4: Copy WASM files to Evolution API
    console.log('\n4. Copying WASM files to Evolution API...');
    
    const wasmSourcePath = path.join(whatsmeowPath, 'wasm', 'dist');
    
    if (!fs.existsSync(wasmSourcePath)) {
      throw new Error(`WASM build output not found at ${wasmSourcePath}`);
    }

    // Create target directory
    if (!fs.existsSync(evolutionWasmPath)) {
      fs.mkdirSync(evolutionWasmPath, { recursive: true });
    }

    // Copy WASM files
    const wasmFile = path.join(wasmSourcePath, 'whatsmeow.wasm');
    const wasmExecFile = path.join(wasmSourcePath, 'wasm_exec.js');

    if (fs.existsSync(wasmFile)) {
      fs.copyFileSync(wasmFile, path.join(evolutionWasmPath, 'whatsmeow.wasm'));
      console.log('   ✅ whatsmeow.wasm copied');
    } else {
      throw new Error('whatsmeow.wasm not found in build output');
    }

    if (fs.existsSync(wasmExecFile)) {
      fs.copyFileSync(wasmExecFile, path.join(evolutionWasmPath, 'wasm_exec.js'));
      console.log('   ✅ wasm_exec.js copied');
    } else {
      throw new Error('wasm_exec.js not found in build output');
    }

    // Step 5: Create Go WASM polyfill for Node.js
    console.log('\n5. Creating Node.js WASM polyfill...');
    
    const polyfillContent = `
// Go WASM polyfill for Node.js environment
if (typeof global !== 'undefined') {
  // Polyfill for Node.js environment
  global.global = global;
  global.window = global;
  global.document = {
    createElement: () => ({}),
    getElementById: () => null,
  };
  global.navigator = { userAgent: 'node' };
  global.crypto = require('crypto').webcrypto || {
    getRandomValues: (array) => {
      const randomBytes = require('crypto').randomBytes(array.length);
      array.set(randomBytes);
    }
  };
  
  // Load wasm_exec.js
  require('./wasm_exec.js');
  
  module.exports = global.Go;
}
`;

    fs.writeFileSync(
      path.join(evolutionWasmPath, 'go-wasm-polyfill.js'), 
      polyfillContent.trim()
    );
    console.log('   ✅ go-wasm-polyfill.js created');

    // Step 6: Update package.json if needed
    console.log('\n6. Checking package.json dependencies...');
    
    const packageJsonPath = path.join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    let needsUpdate = false;
    const requiredDeps = {
      'joi': '^17.0.0'
    };

    for (const [dep, version] of Object.entries(requiredDeps)) {
      if (!packageJson.dependencies[dep] && !packageJson.devDependencies[dep]) {
        console.log(`   ⚠️  Missing dependency: ${dep}`);
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      console.log('   Please install missing dependencies with: npm install joi');
    } else {
      console.log('   ✅ All dependencies satisfied');
    }

    // Success message
    console.log('\n🎉 Whatsmeow WASM integration installed successfully!');
    console.log('\nNext steps:');
    console.log('1. Add whatsmeow router to your main router');
    console.log('2. Set environment variables:');
    console.log('   - WHATSMEOW_WASM_ENABLED=true');
    console.log('   - WHATSMEOW_MAX_INSTANCES=10');
    console.log('3. Start the Evolution API server');
    console.log('4. Test the integration with API endpoints');

  } catch (error) {
    console.error('\n❌ Installation failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  installWhatsmeowWasm();
}

module.exports = { installWhatsmeowWasm };