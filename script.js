/* ============================================
   GLOBAL VARIABLES
   ============================================ */

let selectedMolecules = [];
let stats = {
    experiments: 0,
    reactions: 0,
    physics: 0,
    xp: 0
};

let history = [];
let currentPhysicsTab = 'circuit';

// Physics simulation variables
let circuitActive = false;
let ballFalling = false;
let waveTime = 0;
let magnetField = 5;

// Reaction database
const reactions = {
    'H2+O2': {
        name: '2H₂ + O₂ → 2H₂O',
        products: ['H2O', 'H2O'],
        description: 'Vodorod va kislorod birlashib suvga aylandi',
        xp: 20,
        particles: 2
    },
    'C+O2': {
        name: 'C + O₂ → CO₂',
        products: ['CO2'],
        description: 'Uglerod va kislorod birlashib karbonat angidridu hosil qildi',
        xp: 15,
        particles: 1
    },
    'Na+Cl2': {
        name: '2Na + Cl₂ → 2NaCl',
        products: ['NaCl', 'NaCl'],
        description: 'Natriy va xlor birlashib osh tuzi hosil qildi',
        xp: 25,
        particles: 2
    },
    'Fe+S': {
        name: 'Fe + S → FeS',
        products: ['FeS'],
        description: 'Temir va oltingugurt birlashib demir sulfid hosil qildi',
        xp: 18,
        particles: 1
    },
    'N2+H2': {
        name: 'N₂ + 3H₂ → 2NH₃',
        products: ['NH3', 'NH3'],
        description: 'Azot va vodorod birlashib ammiak hosil qildi',
        xp: 30,
        particles: 2
    }
};

/* ============================================
   SECTION NAVIGATION
   ============================================ */

function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(sectionId).classList.add('active');
    
    // Initialize physics canvases if physics section
    if (sectionId === 'physics') {
        setTimeout(() => {
            initializePhysicsCanvases();
        }, 100);
    }
}

/* ============================================
   DRAG AND DROP FUNCTIONALITY
   ============================================ */

// Setup drag and drop for molecules
document.addEventListener('DOMContentLoaded', () => {
    setupDragAndDrop();
    updateStats();
    initializeParticles();
});

function setupDragAndDrop() {
    const experimentField = document.getElementById('experimentField');
    const moleculeCards = document.querySelectorAll('.molecule-card');
    
    // Molecule drag start
    moleculeCards.forEach(card => {
        card.addEventListener('dragstart', (e) => {
            const molecule = card.dataset.molecule;
            const name = card.dataset.name;
            e.dataTransfer.effectAllowed = 'copy';
            e.dataTransfer.setData('molecule', molecule);
            e.dataTransfer.setData('name', name);
        });
    });
    
    // Tap/click a molecule card to add it to the field (works on touch screens)
    moleculeCards.forEach(card => {
        card.addEventListener('click', () => {
            const rect = experimentField.getBoundingClientRect();
            const x = 40 + Math.random() * Math.max(10, rect.width - 80);
            const y = 40 + Math.random() * Math.max(10, rect.height - 80);
            addMoleculeToField(card.dataset.molecule, card.dataset.name, x, y);
        });
    });

    // Experiment field drag over
    experimentField.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        experimentField.classList.add('drag-over');
    });
    
    // Experiment field drag leave
    experimentField.addEventListener('dragleave', () => {
        experimentField.classList.remove('drag-over');
    });
    
    // Experiment field drop
    experimentField.addEventListener('drop', (e) => {
        e.preventDefault();
        experimentField.classList.remove('drag-over');
        
        const molecule = e.dataTransfer.getData('molecule');
        const name = e.dataTransfer.getData('name');
        
        addMoleculeToField(molecule, name, e.clientX - experimentField.getBoundingClientRect().left, e.clientY - experimentField.getBoundingClientRect().top);
    });
}

function addMoleculeToField(molecule, name, x, y) {
    const experimentField = document.getElementById('experimentField');
    
    // Create molecule element
    const moleculeEl = document.createElement('div');
    moleculeEl.className = 'experiment-molecule';
    moleculeEl.dataset.molecule = molecule;
    moleculeEl.dataset.name = name;
    moleculeEl.textContent = molecule.replace(/\d/g, match => '₀₁₂₃₄₅₆₇₈₉'.split('')[match]);
    moleculeEl.style.left = (x - 20) + 'px';
    moleculeEl.style.top = (y - 20) + 'px';
    
    experimentField.appendChild(moleculeEl);
    selectedMolecules.push(molecule);
    
    // Make molecule draggable within field
    makeMoleculeDraggable(moleculeEl);
    
    // Check for reaction when 2+ molecules are added
    if (selectedMolecules.length >= 2) {
        checkForReaction();
    }
}

function makeMoleculeDraggable(el) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    
    el.addEventListener('mousedown', (e) => {
        pos3 = e.clientX;
        pos4 = e.clientY;
        
        const onMouseMove = (e) => {
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            el.style.top = (el.offsetTop - pos2) + 'px';
            el.style.left = (el.offsetLeft - pos1) + 'px';
        };
        
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
    
    // Right click to remove
    el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        el.remove();
        selectedMolecules = selectedMolecules.filter(m => m !== el.dataset.molecule);
    });
}

/* ============================================
   REACTION DETECTION
   ============================================ */

function checkForReaction() {
    if (selectedMolecules.length < 2) return;
    
    // Create sorted key for reaction lookup
    const sorted = selectedMolecules.slice().sort().join('+');
    
    // Check all possible reactions
    for (const [key, reaction] of Object.entries(reactions)) {
        const reactionParts = key.split('+').sort().join('+');
        if (sorted.includes(reactionParts)) {
            triggerReaction(reaction);
            return;
        }
    }
    
    // No reaction found
    showNotification('Bu kombinatsiya uchun ushbu laboratoriyada reaksiya modeli mavjud emas.');
}

function triggerReaction(reaction) {
    const experimentField = document.getElementById('experimentField');
    const molecules = experimentField.querySelectorAll('.experiment-molecule');
    
    // Play sound
    playReactionSound(reaction.name);
    
    // Animate molecules coming together
    molecules.forEach(mol => {
        mol.style.animation = 'none';
        setTimeout(() => {
            mol.style.animation = '';
            mol.style.left = (experimentField.offsetWidth / 2 - 20) + 'px';
            mol.style.top = (experimentField.offsetHeight / 2 - 20) + 'px';
        }, 10);
    });
    
    // Create explosion effect
    createExplosion(experimentField.offsetWidth / 2, experimentField.offsetHeight / 2);
    
    // Remove old molecules and create new ones
    setTimeout(() => {
        molecules.forEach(mol => mol.remove());
        
        // Create product molecules
        reaction.products.forEach((product, i) => {
            const angle = (i / reaction.products.length) * Math.PI * 2;
            const distance = 100;
            const x = experimentField.offsetWidth / 2 + Math.cos(angle) * distance;
            const y = experimentField.offsetHeight / 2 + Math.sin(angle) * distance;
            
            const newMol = document.createElement('div');
            newMol.className = 'experiment-molecule';
            newMol.dataset.molecule = product;
            newMol.textContent = product.replace(/\d/g, match => '₀₁₂₃₄₅₆₇₈₉'.split('')[match]);
            newMol.style.left = x + 'px';
            newMol.style.top = y + 'px';
            newMol.style.background = 'radial-gradient(circle at 30% 30%, rgba(100, 200, 255, 0.8), rgba(0, 255, 200, 0.4))';
            experimentField.appendChild(newMol);
        });
        
        // Update result panel
        showReactionResult(reaction);
        
        // Update stats
        stats.reactions++;
        stats.xp += reaction.xp;
        stats.experiments++;
        updateStats();
        
        // Add to history
        addToHistory(reaction.name, reaction.xp);
        
        // Reset selected molecules
        selectedMolecules = [];
    }, 500);
}

function createExplosion(x, y) {
    const experimentField = document.getElementById('experimentField');
    const explosionParticles = 15;
    
    for (let i = 0; i < explosionParticles; i++) {
        const particle = document.createElement('div');
        particle.style.position = 'absolute';
        particle.style.left = x + 'px';
        particle.style.top = y + 'px';
        particle.style.width = '8px';
        particle.style.height = '8px';
        particle.style.background = i % 2 === 0 ? 'rgba(0, 255, 200, 0.8)' : 'rgba(100, 200, 255, 0.8)';
        particle.style.borderRadius = '50%';
        particle.style.pointerEvents = 'none';
        particle.style.boxShadow = '0 0 10px currentColor';
        experimentField.appendChild(particle);
        
        const angle = (Math.PI * 2 * i) / explosionParticles;
        const velocity = 3 + Math.random() * 3;
        let vx = Math.cos(angle) * velocity;
        let vy = Math.sin(angle) * velocity;
        let posX = x;
        let posY = y;
        let opacity = 1;
        
        const animate = () => {
            posX += vx;
            posY += vy;
            vy += 0.1; // gravity
            opacity -= 0.02;
            
            particle.style.left = posX + 'px';
            particle.style.top = posY + 'px';
            particle.style.opacity = opacity;
            
            if (opacity > 0) {
                requestAnimationFrame(animate);
            } else {
                particle.remove();
            }
        };
        animate();
    }
}

function showReactionResult(reaction) {
    const resultPanel = document.getElementById('resultPanel');
    const resultContent = document.getElementById('resultContent');
    
    resultContent.innerHTML = `
        <div style="animation: slideIn 0.5s ease-out;">
            <div style="color: #00ffcc; font-size: 1.2rem; font-weight: bold; margin-bottom: 1rem;">✓ REAKSIYA YAKUNLANDI</div>
            <div style="color: #64b5ff; font-size: 1rem; margin-bottom: 0.5rem;">${reaction.name}</div>
            <div style="color: #b0b0ff; margin-bottom: 1rem;">${reaction.description}</div>
            <div style="color: #00ffcc;">+${reaction.xp} XP</div>
        </div>
    `;
}

/* ============================================
   CLEAR EXPERIMENT
   ============================================ */

function clearExperiment() {
    const experimentField = document.getElementById('experimentField');
    const molecules = experimentField.querySelectorAll('.experiment-molecule');
    molecules.forEach(mol => mol.remove());
    selectedMolecules = [];
    
    const resultContent = document.getElementById('resultContent');
    resultContent.textContent = 'Tajriba natijasi shu yerda ko\'rinadi';
}

/* ============================================
   STATS AND LEVEL SYSTEM
   ============================================ */

function updateStats() {
    // Update chemistry stats
    document.getElementById('expCount').textContent = stats.experiments;
    document.getElementById('reactCount').textContent = stats.reactions;
    document.getElementById('xpCount').textContent = stats.xp;
    
    // Update main stats
    document.getElementById('totalExperiments').textContent = stats.experiments;
    document.getElementById('totalReactions').textContent = stats.reactions;
    document.getElementById('totalPhysics').textContent = stats.physics;
    document.getElementById('totalXP').textContent = stats.xp;
    
    // Update level
    updateLevel();
}

function updateLevel() {
    const levels = [
        { name: '🧪 Beginner', minXp: 0, maxXp: 100 },
        { name: '🔬 Researcher', minXp: 100, maxXp: 250 },
        { name: '⚗️ Scientist', minXp: 250, maxXp: 500 },
        { name: '🏆 Master Scientist', minXp: 500, maxXp: Infinity }
    ];
    
    let currentLevel = levels[0];
    for (const level of levels) {
        if (stats.xp >= level.minXp) {
            currentLevel = level;
        }
    }
    
    document.getElementById('levelName').textContent = currentLevel.name;
    
    const xpInLevel = stats.xp - currentLevel.minXp;
    const totalXpForLevel = currentLevel.maxXp - currentLevel.minXp;
    const progress = Math.min(100, (xpInLevel / totalXpForLevel) * 100);
    
    document.getElementById('progressFill').style.width = progress + '%';
    document.getElementById('levelInfo').textContent = `${xpInLevel} / ${totalXpForLevel} XP`;
}

/* ============================================
   HISTORY
   ============================================ */

function addToHistory(reaction, xp) {
    const now = new Date().toLocaleTimeString('uz-UZ');
    history.push({ reaction, xp, time: now });
    updateHistoryDisplay();
}

function updateHistoryDisplay() {
    const historyList = document.getElementById('historyList');
    
    if (history.length === 0) {
        historyList.innerHTML = '<div class="history-empty">Hali tajriba yo\'q</div>';
        return;
    }
    
    historyList.innerHTML = history.map(item => `
        <div class="history-item" style="animation: slideIn 0.3s ease-out;">
            <div class="history-reaction">✓ ${item.reaction}</div>
            <div style="display: flex; gap: 2rem;">
                <div class="history-time">${item.time}</div>
                <div style="color: #00ffcc; font-weight: bold;">+${item.xp} XP</div>
            </div>
        </div>
    `).join('');
}

/* ============================================
   PHYSICS TAB SWITCHING
   ============================================ */

function switchPhysicsTab(tabName, btn) {
    currentPhysicsTab = tabName;
    
    // Hide all physics experiments
    document.querySelectorAll('.physics-exp').forEach(exp => {
        exp.classList.remove('active');
    });
    
    // Show selected experiment
    document.getElementById(tabName + '-content').classList.add('active');
    
    // Update tab buttons
    document.querySelectorAll('.physics-tab').forEach(btn => {
        btn.classList.remove('active');
    });
    if (btn) btn.classList.add('active');

    // Start the drawing for the newly opened experiment
    initializePhysicsCanvases();
}

/* ============================================
   PHYSICS EXPERIMENTS INITIALIZATION
   ============================================ */

function initializePhysicsCanvases() {
    const circuitCanvas = document.getElementById('circuitCanvas');
    const magnetCanvas = document.getElementById('magnetCanvas');
    const gravityCanvas = document.getElementById('gravityCanvas');
    const forceCanvas = document.getElementById('forceCanvas');
    const wavesCanvas = document.getElementById('wavesCanvas');
    
    if (circuitCanvas) drawCircuit(circuitCanvas);
    if (magnetCanvas) drawMagnetField(magnetCanvas);
    if (gravityCanvas) drawGravitySetup(gravityCanvas);
    if (forceCanvas) drawForceSetup(forceCanvas);
    if (wavesCanvas) startWaves(wavesCanvas);
}

/* ============================================
   CIRCUIT EXPERIMENT
   ============================================ */

function drawCircuit(canvas) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw battery
    ctx.strokeStyle = '#00ffcc';
    ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(0, 255, 200, 0.2)';
    ctx.fillRect(20, 80, 40, 80);
    ctx.strokeRect(20, 80, 40, 80);
    
    // Draw wire
    ctx.beginPath();
    ctx.moveTo(60, 90);
    ctx.lineTo(200, 90);
    ctx.lineTo(200, 140);
    ctx.lineTo(60, 140);
    ctx.closePath();
    ctx.stroke();
    
    // Draw light bulb
    ctx.beginPath();
    ctx.arc(200, 115, 20, 0, Math.PI * 2);
    ctx.fillStyle = circuitActive ? 'rgba(255, 255, 0, 0.8)' : 'rgba(100, 100, 100, 0.3)';
    ctx.fill();
    ctx.strokeStyle = '#64b5ff';
    ctx.stroke();
    
    // Draw switch
    ctx.fillStyle = circuitActive ? '#00ff00' : '#ff6464';
    ctx.beginPath();
    ctx.arc(120, 60, 8, 0, Math.PI * 2);
    ctx.fill();
    
    // Labels
    ctx.fillStyle = '#00ffcc';
    ctx.font = '12px Arial';
    ctx.fillText('Battery', 20, 75);
    ctx.fillText('Light', 190, 155);
    ctx.fillText('Switch', 110, 75);
}

function toggleCircuit() {
    circuitActive = !circuitActive;
    const status = document.getElementById('circuitStatus');
    status.textContent = circuitActive ? 'Zanjai: YOQILGAN ✓' : 'Zanjai: O\'CHIQ';
    status.style.color = circuitActive ? '#00ffcc' : '#ff6464';
    
    const canvas = document.getElementById('circuitCanvas');
    drawCircuit(canvas);
    
    if (circuitActive) {
        playSound(800, 0.2, 0.1);
        stats.physics++;
        updateStats();
    }
}

/* ============================================
   MAGNET EXPERIMENT
   ============================================ */

function drawMagnetField(canvas) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw magnet
    ctx.fillStyle = 'rgba(255, 100, 100, 0.6)';
    ctx.fillRect(30, 80, 50, 100);
    ctx.fillStyle = '#ff6464';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('N', 40, 135);
    
    ctx.fillStyle = 'rgba(100, 100, 255, 0.6)';
    ctx.fillRect(130, 80, 50, 100);
    ctx.fillStyle = '#6464ff';
    ctx.fillText('S', 145, 135);
    
    // Draw magnetic field lines
    ctx.strokeStyle = 'rgba(0, 255, 200, 0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.arc(canvas.width / 2, 130, 20 + i * 15, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    // Draw iron particles
    ctx.fillStyle = 'rgba(100, 200, 255, 0.8)';
    for (let i = 0; i < magnetField; i++) {
        ctx.beginPath();
        ctx.arc(200 + i * 15, 130, 5, 0, Math.PI * 2);
        ctx.fill();
    }
    
    ctx.fillStyle = '#00ffcc';
    ctx.font = '12px Arial';
    ctx.fillText('Magnit maydoni', 10, 30);
}

function updateMagnetField() {
    magnetField = parseInt(document.getElementById('magnetStrength').value);
    document.getElementById('magnetValue').textContent = magnetField;
    
    const canvas = document.getElementById('magnetCanvas');
    drawMagnetField(canvas);
    
    }

/* ============================================
   GRAVITY EXPERIMENT
   ============================================ */

let gravitySimulation = {
    falling: false,
    time: 0,
    height: 230,
    velocity: 0
};

function drawGravitySetup(canvas) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw platform
    ctx.fillStyle = 'rgba(0, 255, 200, 0.5)';
    ctx.fillRect(0, 20, canvas.width, 10);
    ctx.strokeStyle = '#00ffcc';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 20, canvas.width, 10);
    
    // Draw ball
    let ballY = 50;
    if (gravitySimulation.falling) {
        ballY = 50 + gravitySimulation.height;
    }
    
    ctx.fillStyle = 'rgba(100, 200, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(canvas.width / 2, ballY, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#00ffcc';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw height line
    if (gravitySimulation.falling) {
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.3)';
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2 + 30, 50);
        ctx.lineTo(canvas.width / 2 + 30, ballY);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw measurements
        ctx.fillStyle = '#64b5ff';
        ctx.font = '12px Arial';
        ctx.fillText('h = ' + (gravitySimulation.height / 50).toFixed(1) + 'm', canvas.width / 2 + 40, ballY);
        ctx.fillText('t = ' + gravitySimulation.time.toFixed(2) + 's', canvas.width / 2 + 40, ballY + 15);
        ctx.fillText('v = ' + (gravitySimulation.velocity).toFixed(1) + ' m/s', canvas.width / 2 + 40, ballY + 30);
    }
    
    ctx.fillStyle = '#00ffcc';
    ctx.font = '12px Arial';
    ctx.fillText('g = 9.8 m/s²', 10, 290);
}

function dropBall() {
    gravitySimulation.falling = true;
    gravitySimulation.time = 0;
    gravitySimulation.height = 0;
    gravitySimulation.velocity = 0;
    
    playSound(600, 0.2, 0.3);
    
    const animateFall = () => {
        const gravity = 9.8;
        gravitySimulation.time += 0.016;
        gravitySimulation.height = 0.5 * gravity * Math.pow(gravitySimulation.time, 2) * 20;
        gravitySimulation.velocity = gravity * gravitySimulation.time * 10;
        
        if (gravitySimulation.height >= 230) {
            gravitySimulation.height = 230;
            playSound(400, 0.3, 0.2);
            playSound(300, 0.2, 0.15);
            gravitySimulation.falling = false;
            stats.physics++;
            updateStats();
        }
        
        const canvas = document.getElementById('gravityCanvas');
        if (canvas) {
            drawGravitySetup(canvas);
        }
        
        if (gravitySimulation.falling) {
            requestAnimationFrame(animateFall);
        }
    };
    
    animateFall();
}

/* ============================================
   FORCE AND MOTION EXPERIMENT
   ============================================ */

function drawForceSetup(canvas) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const mass = parseInt(document.getElementById('mass').value);
    const force = parseInt(document.getElementById('force').value);
    const acceleration = force / mass;
    
    // Draw surface
    ctx.strokeStyle = '#00ffcc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 200);
    ctx.lineTo(canvas.width, 200);
    ctx.stroke();
    
    // Draw object
    const size = 30 + mass * 5;
    ctx.fillStyle = 'rgba(100, 200, 255, 0.6)';
    ctx.fillRect(100, 200 - size, size, size);
    ctx.strokeStyle = '#64b5ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(100, 200 - size, size, size);
    
    // Draw force arrow
    ctx.strokeStyle = '#00ffcc';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(130 + size, 200 - size / 2);
    ctx.lineTo(130 + size + force * 2, 200 - size / 2);
    ctx.stroke();
    
    // Draw arrow head
    ctx.beginPath();
    ctx.moveTo(130 + size + force * 2, 200 - size / 2);
    ctx.lineTo(130 + size + force * 2 - 10, 200 - size / 2 - 8);
    ctx.lineTo(130 + size + force * 2 - 10, 200 - size / 2 + 8);
    ctx.closePath();
    ctx.fillStyle = '#00ffcc';
    ctx.fill();
    
    // Draw info
    ctx.fillStyle = '#64b5ff';
    ctx.font = '12px Arial';
    ctx.fillText('m = ' + mass + ' kg', 10, 30);
    ctx.fillText('F = ' + force + ' N', 10, 50);
    ctx.fillText('a = ' + acceleration.toFixed(2) + ' m/s²', 10, 70);
    ctx.fillText('F = m × a', canvas.width - 100, 30);
    
    document.getElementById('accelerationResult').textContent = 'a = ' + acceleration.toFixed(2) + ' m/s²';
}

function updateForce() {
    const canvas = document.getElementById('forceCanvas');
    if (canvas) {
        drawForceSetup(canvas);
            }
}

/* ============================================
   WAVES EXPERIMENT
   ============================================ */

function drawWaves(canvas) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const amplitude = parseInt(document.getElementById('amplitude').value);
    const frequency = parseFloat(document.getElementById('frequency').value);
    
    ctx.strokeStyle = 'rgba(0, 255, 200, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    for (let x = 0; x < canvas.width; x++) {
        const y = 150 + Math.sin((x / 30) * frequency - waveTime) * amplitude;
        if (x === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.stroke();
    
    // Draw info
    ctx.fillStyle = '#64b5ff';
    ctx.font = '12px Arial';
    ctx.fillText('Amplituda: ' + amplitude, 10, 30);
    ctx.fillText('Chastota: ' + frequency.toFixed(1), 10, 50);
    ctx.fillText('Wavelength: ' + (60 / frequency).toFixed(1), 10, 70);
    
    waveTime += 0.1;
}

// Single guarded animation loop for waves (prevents loops from piling up)
let wavesRunning = false;
function startWaves(canvas) {
    if (wavesRunning) return;
    wavesRunning = true;
    const loop = () => {
        if (currentPhysicsTab !== 'waves') {
            wavesRunning = false;
            return;
        }
        drawWaves(canvas);
        requestAnimationFrame(loop);
    };
    loop();
}

function updateWave() {
    document.getElementById('amplitudeValue').textContent = document.getElementById('amplitude').value;
    document.getElementById('frequencyValue').textContent = document.getElementById('frequency').value;
    
    }

/* ============================================
   SOUND EFFECTS
   ============================================ */

function playReactionSound(reactionName) {
    if (reactionName.includes('H₂O') || reactionName.includes('H2O')) {
        // Water formation sound
        playSound(800, 0.3, 0.1);
        setTimeout(() => playSound(600, 0.2, 0.1), 100);
    } else if (reactionName.includes('explosion') || reactionName.includes('Na')) {
        // Explosion sound
        playSound(1200, 0.4, 0.05);
        setTimeout(() => playSound(600, 0.3, 0.1), 50);
    } else {
        // General reaction sound
        playSound(700, 0.3, 0.1);
    }
}

function playSound(frequency, volume, duration) {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
    } catch (e) {
        console.log('Audio not available');
    }
}

/* ============================================
   NOTIFICATIONS
   ============================================ */

function showNotification(message) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

/* ============================================
   BACKGROUND PARTICLES
   ============================================ */

function initializeParticles() {
    const background = document.querySelector('.particles-background');
    if (background) {
        // Particles already initialized via CSS
    }
}

/* ============================================
   RESPONSIVE ADJUSTMENTS
   ============================================ */

window.addEventListener('resize', () => {
    if (currentPhysicsTab) {
        setTimeout(() => {
            initializePhysicsCanvases();
        }, 100);
    }
});
