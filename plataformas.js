document.addEventListener('DOMContentLoaded', () => {
    // Alias de Matter.js
    const { Engine, Render, Runner, World, Bodies, Body, Events, Query } = Matter;

    // ========================================
    // VARIABLES GLOBALES
    // ========================================
    let engine, render, runner, world;
    let player, targetBox, goal;
    let currentLevel = 1;
    const MAX_LEVEL = 3;
    let totalWork = 0;
    let playerMass = 5;
    let gameIsPaused = false;
    let levelStartTime = 0;
    let currentTime = 0;
    let levelTimes = [null, null, null];

    // ========================================
    // CONSTANTES FÍSICAS
    // ========================================
    const g = 1; // Gravedad de Matter.js
    const realG = 9.8; // Gravedad real para cálculos
    const playerFriction = 0.1;
    const boxFriction = 0.5;
    const playerEfficiency = 0.25;

    // ========================================
    // REFERENCIAS AL DOM
    // ========================================
    const canvasContainer = document.getElementById('canvas-container');
    const massStat = document.getElementById('stats-mass');
    const workStat = document.getElementById('stats-work');
    const energyStat = document.getElementById('stats-energy');
    const efficiencyStat = document.getElementById('stats-efficiency');
    const levelStat = document.getElementById('stats-level');
    const timeStat = document.getElementById('stats-time');
    const modalWin = document.getElementById('modal-win');
    const modalFinal = document.getElementById('modal-final');
    const nextLevelBtn = document.getElementById('next-level-btn');
    const restartBtn = document.getElementById('restart-btn');
    const resetBtn = document.getElementById('reset-btn');

    // ========================================
    // CONTROLES - SIMPLIFICADO
    // ========================================
    const keys = { 
        left: false, 
        right: false
    };
    let canJump = true; // Control de salto

    // ========================================
    // INICIALIZACIÓN
    // ========================================
    function init() {
        engine = Engine.create();
        world = engine.world;
        engine.world.gravity.y = g;

        render = Render.create({
            element: canvasContainer,
            engine: engine,
            options: {
                width: 800,
                height: 600,
                wireframes: false,
                background: 'transparent'
            }
        });

        runner = Runner.create();
        Render.run(render);
        Runner.run(runner, engine);

        efficiencyStat.textContent = `${playerEfficiency * 100}%`;
        loadLevel(currentLevel);
        setupEventListeners();
    }

    // ========================================
    // CARGA DE NIVELES
    // ========================================
    function loadLevel(level) {
        if (level > MAX_LEVEL) level = 1;
        
        gameIsPaused = false;
        World.clear(world);
        resetStats();
        currentLevel = level;
        levelStat.textContent = currentLevel;
        playerMass = 5;
        levelStartTime = Date.now();
        updateStatsUI();

        let bodies = [];

        // Paredes y suelo
        bodies.push(Bodies.rectangle(400, 590, 800, 20, { 
            isStatic: true, 
            label: 'ground',
            friction: 1,
            render: { fillStyle: '#1f2937' }
        }));
        bodies.push(Bodies.rectangle(10, 300, 20, 600, { 
            isStatic: true, 
            label: 'wall',
            render: { fillStyle: '#1f2937' }
        }));
        bodies.push(Bodies.rectangle(790, 300, 20, 600, { 
            isStatic: true, 
            label: 'wall',
            render: { fillStyle: '#1f2937' }
        }));

        // ========================================
        // NIVEL 1 - FÁCIL: Terreno plano simple
        // ========================================
        if (level === 1) {
            player = Bodies.rectangle(100, 520, 40, 40, {
                mass: playerMass,
                label: 'player',
                friction: playerFriction,
                frictionAir: 0.01,
                restitution: 0,
                inertia: Infinity,
                render: { fillStyle: '#34d399' }
            });
            
            targetBox = Bodies.rectangle(300, 530, 50, 50, {
                mass: 8,
                label: 'targetBox',
                friction: boxFriction,
                frictionStatic: 0.5,
                restitution: 0,
                render: { fillStyle: '#ef4444' }
            });
            
            goal = Bodies.rectangle(700, 520, 20, 100, {
                isStatic: true,
                isSensor: true,
                label: 'goal',
                render: { fillStyle: '#3b82f6' }
            });
            
            let bonus1 = Bodies.circle(450, 500, 15, {
                isStatic: true,
                isSensor: true,
                label: 'bonus-3',
                render: { fillStyle: '#a3e635' }
            });
            
            bodies.push(player, targetBox, goal, bonus1);
        } 
        // ========================================
        // NIVEL 2 - MEDIO: Con pequeño obstáculo
        // ========================================
        else if (level === 2) {
            player = Bodies.rectangle(80, 520, 40, 40, {
                mass: playerMass,
                label: 'player',
                friction: playerFriction,
                frictionAir: 0.01,
                restitution: 0,
                inertia: Infinity,
                render: { fillStyle: '#34d399' }
            });
            
            targetBox = Bodies.rectangle(220, 530, 60, 60, {
                mass: 12,
                label: 'targetBox',
                friction: boxFriction,
                frictionStatic: 0.5,
                restitution: 0,
                render: { fillStyle: '#ef4444' }
            });
            
            goal = Bodies.rectangle(730, 520, 20, 100, {
                isStatic: true,
                isSensor: true,
                label: 'goal',
                render: { fillStyle: '#3b82f6' }
            });
            
            // Pequeño escalón bajo
            let step1 = Bodies.rectangle(400, 570, 60, 20, {
                isStatic: true,
                label: 'ground',
                friction: 1,
                render: { fillStyle: '#1f2937' }
            });
            
            let bonus1 = Bodies.circle(350, 500, 15, {
                isStatic: true,
                isSensor: true,
                label: 'bonus-5',
                render: { fillStyle: '#a3e635' }
            });
            
            let bonus2 = Bodies.circle(550, 500, 15, {
                isStatic: true,
                isSensor: true,
                label: 'bonus-5',
                render: { fillStyle: '#a3e635' }
            });
            
            bodies.push(player, targetBox, goal, step1, bonus1, bonus2);
        } 
        // ========================================
        // NIVEL 3 - DIFÍCIL: Más obstáculos y caja más pesada
        // ========================================
        else if (level === 3) {
            player = Bodies.rectangle(70, 520, 40, 40, {
                mass: playerMass,
                label: 'player',
                friction: playerFriction,
                frictionAir: 0.01,
                restitution: 0,
                inertia: Infinity,
                render: { fillStyle: '#34d399' }
            });
            
            targetBox = Bodies.rectangle(180, 520, 70, 70, {
                mass: 18,
                label: 'targetBox',
                friction: boxFriction,
                frictionStatic: 0.5,
                restitution: 0,
                render: { fillStyle: '#ef4444' }
            });
            
            goal = Bodies.rectangle(750, 520, 20, 100, {
                isStatic: true,
                isSensor: true,
                label: 'goal',
                render: { fillStyle: '#3b82f6' }
            });
            
            // Obstáculos bajos
            let step1 = Bodies.rectangle(350, 570, 50, 20, {
                isStatic: true,
                label: 'ground',
                friction: 1,
                render: { fillStyle: '#1f2937' }
            });
            
            let step2 = Bodies.rectangle(550, 570, 50, 20, {
                isStatic: true,
                label: 'ground',
                friction: 1,
                render: { fillStyle: '#1f2937' }
            });
            
            let bonus1 = Bodies.circle(280, 500, 15, {
                isStatic: true,
                isSensor: true,
                label: 'bonus-6',
                render: { fillStyle: '#a3e635' }
            });
            
            let bonus2 = Bodies.circle(450, 500, 15, {
                isStatic: true,
                isSensor: true,
                label: 'bonus-7',
                render: { fillStyle: '#a3e635' }
            });
            
            let bonus3 = Bodies.circle(650, 500, 15, {
                isStatic: true,
                isSensor: true,
                label: 'bonus-7',
                render: { fillStyle: '#a3e635' }
            });
            
            bodies.push(player, targetBox, goal, step1, step2, bonus1, bonus2, bonus3);
        }

        World.add(world, bodies);
    }

    // ========================================
    // EVENT LISTENERS
    // ========================================
    function setupEventListeners() {
        // Keydown
        window.addEventListener('keydown', (e) => {
            if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
                e.preventDefault();
            }
            
            if (e.key === 'ArrowLeft') {
                keys.left = true;
            }
            if (e.key === 'ArrowRight') {
                keys.right = true;
            }
            if (e.key === 'ArrowUp' && canJump && isOnGround()) {
                // Aplicar impulso de salto inmediatamente
                Body.setVelocity(player, {
                    x: player.velocity.x,
                    y: -10 // Velocidad de salto fija
                });
                canJump = false;
            }
        });
        
        // Keyup
        window.addEventListener('keyup', (e) => {
            if (e.key === 'ArrowLeft') {
                keys.left = false;
            }
            if (e.key === 'ArrowRight') {
                keys.right = false;
            }
            if (e.key === 'ArrowUp') {
                canJump = true;
            }
        });

        // Update loop
        Events.on(engine, 'beforeUpdate', () => {
            if (gameIsPaused) return;
            handleMovement();
            calculatePhysics();
            updateTimer();
        });

        // Colisiones
        Events.on(engine, 'collisionStart', (event) => {
            if (gameIsPaused) return;
            event.pairs.forEach(pair => {
                handleCollision(pair.bodyA, pair.bodyB);
            });
        });
        
        // Botones
        document.getElementById('level1-btn').addEventListener('click', () => loadLevel(1));
        document.getElementById('level2-btn').addEventListener('click', () => loadLevel(2));
        document.getElementById('level3-btn').addEventListener('click', () => loadLevel(3));
        resetBtn.addEventListener('click', () => loadLevel(currentLevel));
        
        nextLevelBtn.addEventListener('click', () => {
            modalWin.classList.add('hidden');
            if (currentLevel >= MAX_LEVEL) {
                showFinalModal();
            } else {
                loadLevel(currentLevel + 1);
            }
        });

        restartBtn.addEventListener('click', () => {
            modalFinal.classList.add('hidden');
            levelTimes = [null, null, null];
            updateTimesDisplay();
            loadLevel(1);
        });
    }

    // ========================================
    // MOVIMIENTO DEL JUGADOR
    // ========================================
    function handleMovement() {
        // Fuerza base aumentada + bonus por masa extra
        const baseMass = 5;
        const extraMass = player.mass - baseMass;
        // Fuerza base + 50% extra por cada kg adicional
        const force = 0.004 * baseMass + (0.003 * extraMass);
        const maxSpeed = 5 + (extraMass * 0.3); // También aumenta velocidad máxima

        if (keys.left && player.velocity.x > -maxSpeed) {
            Body.applyForce(player, player.position, { x: -force, y: 0 });
        }
        if (keys.right && player.velocity.x < maxSpeed) {
            Body.applyForce(player, player.position, { x: force, y: 0 });
        }
    }

    // ========================================
    // VERIFICAR SI ESTÁ EN EL SUELO
    // ========================================
    function isOnGround() {
        // Crear un sensor pequeño debajo del jugador
        const sensorY = player.position.y + 22; // Justo debajo del jugador
        const groundSensor = Bodies.rectangle(player.position.x, sensorY, 38, 4, {
            isSensor: true
        });
        
        const collisions = Query.collides(groundSensor, world.bodies);
        
        // Verificar si hay colisión con el suelo
        const onGround = collisions.some(collision => {
            const other = collision.bodyA === groundSensor ? collision.bodyB : collision.bodyA;
            return other.label === 'ground' && !other.isSensor;
        });
        
        return onGround;
    }

    // ========================================
    // COLISIONES
    // ========================================
    function handleCollision(bodyA, bodyB) {
        const a = bodyA.label;
        const b = bodyB.label;
        
        // Bonus
        if ((a === 'player' && b.startsWith('bonus-')) || (b === 'player' && a.startsWith('bonus-'))) {
            const bonus = a.startsWith('bonus-') ? bodyA : bodyB;
            const bonusMass = parseInt(bonus.label.split('-')[1]);
            playerMass += bonusMass;
            Body.setMass(player, playerMass);
            World.remove(world, bonus);
            updateStatsUI();
        }
        
        // Meta
        if ((a === 'targetBox' && b === 'goal') || (a === 'goal' && b === 'targetBox')) {
            gameIsPaused = true;
            
            const levelTime = ((Date.now() - levelStartTime) / 1000).toFixed(1);
            levelTimes[currentLevel - 1] = parseFloat(levelTime);
            updateTimesDisplay();
            
            document.getElementById('modal-time').textContent = levelTime + 's';
            document.getElementById('modal-work').textContent = totalWork.toFixed(2) + ' J';
            document.getElementById('modal-energy').textContent = (totalWork / playerEfficiency).toFixed(2) + ' J';
            
            modalWin.classList.remove('hidden');
        }
    }

    // ========================================
    // CÁLCULOS FÍSICOS
    // ========================================
    function calculatePhysics() {
        if (!targetBox || targetBox.speed < 0.05) return;
        
        const frictionForce = boxFriction * targetBox.mass * realG;
        const deltaTime = (runner.delta / 1000) || (1 / 60);
        const distance = Math.abs(targetBox.velocity.x * deltaTime);
        
        if (distance > 0) {
            totalWork += (frictionForce * distance);
        }
        
        const totalEnergy = totalWork / playerEfficiency;
        workStat.textContent = totalWork.toFixed(2);
        energyStat.textContent = totalEnergy.toFixed(2);
    }

    // ========================================
    // UI
    // ========================================
    function updateTimer() {
        if (gameIsPaused) return;
        currentTime = ((Date.now() - levelStartTime) / 1000).toFixed(1);
        timeStat.textContent = currentTime;
    }

    function updateTimesDisplay() {
        document.getElementById('time-level1').textContent = levelTimes[0] ? levelTimes[0] + 's' : '--';
        document.getElementById('time-level2').textContent = levelTimes[1] ? levelTimes[1] + 's' : '--';
        document.getElementById('time-level3').textContent = levelTimes[2] ? levelTimes[2] + 's' : '--';
        
        const total = levelTimes.reduce((sum, time) => sum + (time || 0), 0);
        document.getElementById('time-total').textContent = total > 0 ? total.toFixed(1) + 's' : '--';
    }

    function showFinalModal() {
        document.getElementById('final-time1').textContent = levelTimes[0] + 's';
        document.getElementById('final-time2').textContent = levelTimes[1] + 's';
        document.getElementById('final-time3').textContent = levelTimes[2] + 's';
        
        const total = levelTimes.reduce((sum, time) => sum + time, 0);
        document.getElementById('final-total').textContent = total.toFixed(1) + 's';
        
        modalFinal.classList.remove('hidden');
    }

    function updateStatsUI() {
        massStat.textContent = playerMass.toFixed(2);
    }

    function resetStats() {
        totalWork = 0;
        workStat.textContent = '0.00';
        energyStat.textContent = '0.00';
        massStat.textContent = '5.00';
        timeStat.textContent = '0.0';
        modalWin.classList.add('hidden');
        canJump = true;
    }

    // ========================================
    // INICIAR
    // ========================================
    init();
});