document.addEventListener('DOMContentLoaded', () => {
    const { Engine, Render, Runner, World, Bodies, Body, Events, Vector, Constraint, Mouse, MouseConstraint } = Matter;

    // ========================================
    // VARIABLES GLOBALES
    // ========================================
    let engine, render, runner, world;
    let projectile, slingshot, mouseConstraint, goalBox;
    let currentLevel = 1;
    const MAX_LEVEL = 3;
    const MAX_ATTEMPTS = 3;
    let gameState = 'ready';
    let attemptsLeft = MAX_ATTEMPTS;
    let totalLaunches = 0;
    let levelStartTime = 0;
    let levelTimes = [null, null, null];
    let projectileStoppedTimer = null;

    // Energías
    let potentialEnergy = 0;
    let kineticEnergy = 0;
    let workOnImpact = 0;
    let maxPotentialEnergy = 0;
    let launchKineticEnergy = 0;

    // ========================================
    // CONSTANTES FÍSICAS
    // ========================================
    const k_spring = 50;
    const projectileMass = 0.5;
    const SLINGSHOT_X = 200;
    const SLINGSHOT_Y = 550;
    const PIXEL_TO_METER = 100;
    const MAX_STRETCH = 120;
    const GOAL_FALL_THRESHOLD = 600;
    const LAUNCH_SPEED = 8;
    const CANVAS_WIDTH = 1200;
    const CANVAS_HEIGHT = 700;

    // ========================================
    // REFERENCIAS AL DOM
    // ========================================
    const canvasContainer = document.getElementById('canvas-container');
    const potentialStat = document.getElementById('stats-potential');
    const kineticStat = document.getElementById('stats-kinetic');
    const workStat = document.getElementById('stats-work');
    const levelStat = document.getElementById('stats-level');
    const timeStat = document.getElementById('stats-time');
    const velocityStat = document.getElementById('velocity');
    const efficiencyStat = document.getElementById('efficiency');
    const launchCountStat = document.getElementById('launch-count');
    const attemptsStat = document.getElementById('stats-attempts');
    const stretchDistStat = document.getElementById('stretch-dist');
    const modalWin = document.getElementById('modal-win');
    const modalGameOver = document.getElementById('modal-gameover');
    const modalFinal = document.getElementById('modal-final');
    const nextLevelBtn = document.getElementById('next-level-btn');
    const retryLevelBtn = document.getElementById('retry-level-btn');
    const restartBtn = document.getElementById('restart-btn');
    const resetBtn = document.getElementById('reset-btn');

    // ========================================
    // INICIALIZACIÓN
    // ========================================
    function init() {
        engine = Engine.create();
        world = engine.world;
        engine.world.gravity.y = 1;

        render = Render.create({
            element: canvasContainer,
            engine: engine,
            options: {
                width: CANVAS_WIDTH,
                height: CANVAS_HEIGHT,
                wireframes: false,
                background: 'transparent'
            }
        });

        runner = Runner.create();
        Render.run(render);
        Runner.run(runner, engine);

        const mouse = Mouse.create(render.canvas);
        mouseConstraint = MouseConstraint.create(engine, {
            mouse: mouse,
            constraint: {
                stiffness: 0.2,
                render: { visible: false }
            }
        });
        World.add(world, mouseConstraint);

        document.getElementById('spring-k').textContent = k_spring;
        loadLevel(currentLevel);
        setupEventListeners();
    }

    // ========================================
    // CARGA DE NIVELES
    // ========================================
    function loadLevel(level) {
        if (level > MAX_LEVEL) level = 1;

        gameState = 'ready';
        attemptsLeft = MAX_ATTEMPTS;
        if (projectileStoppedTimer) {
            clearTimeout(projectileStoppedTimer);
            projectileStoppedTimer = null;
        }
        World.clear(world);
        Engine.clear(engine);
        resetStats();
        currentLevel = level;
        levelStat.textContent = currentLevel;
        attemptsStat.textContent = attemptsLeft;
        levelStartTime = Date.now();

        let bodies = [];

        // BORDES COMPLETOS (CAJA CERRADA)
        // Suelo
        bodies.push(Bodies.rectangle(CANVAS_WIDTH/2, CANVAS_HEIGHT - 10, CANVAS_WIDTH, 20, { 
            isStatic: true, 
            label: 'ground',
            render: { fillStyle: '#1f2937' }
        }));

        // Techo
        bodies.push(Bodies.rectangle(CANVAS_WIDTH/2, 10, CANVAS_WIDTH, 20, { 
            isStatic: true, 
            label: 'ceiling',
            render: { fillStyle: '#1f2937' }
        }));

        // Pared IZQUIERDA
        bodies.push(Bodies.rectangle(10, CANVAS_HEIGHT/2, 20, CANVAS_HEIGHT, { 
            isStatic: true, 
            label: 'wall-left',
            render: { fillStyle: '#1f2937' }
        }));

        // Pared DERECHA (CORREGIDA)
        bodies.push(Bodies.rectangle(CANVAS_WIDTH - 10, CANVAS_HEIGHT/2, 20, CANVAS_HEIGHT, { 
            isStatic: true, 
            label: 'wall-right',
            render: { fillStyle: '#1f2937' }
        }));

        // PROYECTIL
        projectile = Bodies.circle(SLINGSHOT_X, SLINGSHOT_Y, 15, {
            density: 0.002,
            restitution: 0.5,
            friction: 0.1,
            frictionAir: 0.02,
            label: 'projectile',
            render: { 
                fillStyle: '#ffffff',
                strokeStyle: '#a855f7',
                lineWidth: 3
            }
        });

        // RESORTE
        slingshot = Constraint.create({
            pointA: { x: SLINGSHOT_X, y: SLINGSHOT_Y },
            bodyB: projectile,
            stiffness: 0.05,
            length: 0,
            render: { 
                strokeStyle: '#fbbf24',
                lineWidth: 4,
                type: 'line'
            }
        });
        
        bodies.push(projectile, slingshot);

        // ========================================
        // DISEÑO DE NIVELES MEJORADO
        // ========================================
        
        if (level === 1) {
            // ========================================
            // NIVEL 1 - FÁCIL
            // Torre simple en campo abierto
            // ========================================
            bodies.push(createBox(700, 655, 50, 50, '#ef4444'));
            bodies.push(createBox(700, 605, 50, 50, '#ef4444'));
            goalBox = createBox(700, 555, 50, 50, '#22c55e');
            bodies.push(goalBox);
        } 
        else if (level === 2) {
            // ========================================
            // NIVEL 2 - MEDIO
            // Torre protegida por muro bajo
            // Requiere tiro con parábola o rebote
            // ========================================
            
            // Muro protector bajo
            bodies.push(Bodies.rectangle(600, 600, 15, 180, { 
                isStatic: true,
                render: { fillStyle: '#78716c' }
            }));
            
            // Torre de 4 cajas detrás del muro
            bodies.push(createBox(800, 655, 50, 50, '#ef4444'));
            bodies.push(createBox(800, 605, 50, 50, '#ef4444'));
            bodies.push(createBox(800, 555, 50, 50, '#ef4444'));
            goalBox = createBox(800, 505, 50, 50, '#22c55e');
            
            // Base de soporte
            bodies.push(createBox(750, 655, 50, 50, '#ef4444'));
            bodies.push(createBox(850, 655, 50, 50, '#ef4444'));
            
            bodies.push(goalBox);
        } 
        else if (level === 3) {
            // ========================================
            // NIVEL 3 - DIFÍCIL
            // Fortaleza con doble muro
            // Requiere tiro muy alto o uso de rebotes
            // ========================================
            
            // Primer muro (bajo)
            bodies.push(Bodies.rectangle(550, 590, 15, 200, { 
                isStatic: true,
                render: { fillStyle: '#78716c' }
            }));
            
            // Segundo muro (alto)
            bodies.push(Bodies.rectangle(750, 570, 15, 240, { 
                isStatic: true,
                render: { fillStyle: '#78716c' }
            }));
            
            // Torre muy protegida (5 cajas de alto)
            bodies.push(createBox(950, 655, 50, 50, '#ef4444'));
            bodies.push(createBox(950, 605, 50, 50, '#ef4444'));
            bodies.push(createBox(950, 555, 50, 50, '#ef4444'));
            bodies.push(createBox(950, 505, 50, 50, '#ef4444'));
            goalBox = createBox(950, 455, 50, 50, '#22c55e');
            
            // Base ancha de refuerzo
            bodies.push(createBox(900, 655, 50, 50, '#ef4444'));
            bodies.push(createBox(1000, 655, 50, 50, '#ef4444'));
            bodies.push(createBox(900, 605, 50, 50, '#ef4444'));
            bodies.push(createBox(1000, 605, 50, 50, '#ef4444'));
            bodies.push(createBox(850, 655, 50, 50, '#ef4444'));
            
            bodies.push(goalBox);
        }

        World.add(world, bodies);
        World.add(world, mouseConstraint);
    }

    function createBox(x, y, w, h, color) {
        return Bodies.rectangle(x, y, w, h, {
            density: 0.001,
            friction: 0.5,
            restitution: 0.3,
            render: { 
                fillStyle: color,
                strokeStyle: color === '#22c55e' ? '#16a34a' : '#dc2626',
                lineWidth: 2
            },
            label: color === '#22c55e' ? 'goalBox' : 'box'
        });
    }

    // ========================================
    // EVENT LISTENERS
    // ========================================
    function setupEventListeners() {
        // INICIO DE ARRASTRE
        Events.on(mouseConstraint, 'startdrag', (event) => {
            if (event.body === projectile && gameState === 'ready') {
                gameState = 'dragging';
                kineticEnergy = 0;
                workOnImpact = 0;
                maxPotentialEnergy = 0;
                launchKineticEnergy = 0;
                if (projectileStoppedTimer) {
                    clearTimeout(projectileStoppedTimer);
                    projectileStoppedTimer = null;
                }
            }
        });

        // FIN DE ARRASTRE - LANZAMIENTO
        Events.on(mouseConstraint, 'enddrag', (event) => {
            if (event.body === projectile && gameState === 'dragging') {
                
                const dx = SLINGSHOT_X - projectile.position.x;
                const dy = SLINGSHOT_Y - projectile.position.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > 10) {
                    gameState = 'launched';
                    attemptsLeft--;
                    totalLaunches++;
                    attemptsStat.textContent = attemptsLeft;
                    launchCountStat.textContent = totalLaunches;
                    
                    launchKineticEnergy = maxPotentialEnergy;
                    
                    // Velocidad normalizada
                    const normalizedDx = dx / distance;
                    const normalizedDy = dy / distance;
                    const powerFactor = Math.min(distance / MAX_STRETCH, 1);
                    
                    Body.setVelocity(projectile, {
                        x: normalizedDx * LAUNCH_SPEED * powerFactor,
                        y: normalizedDy * LAUNCH_SPEED * powerFactor
                    });
                    
                    // Eliminar resorte
                    setTimeout(() => {
                        if (slingshot) {
                            World.remove(world, slingshot);
                            slingshot = null;
                        }
                    }, 50);
                    
                    // Verificar game over si no hay más intentos
                    if (attemptsLeft <= 0) {
                        setTimeout(() => {
                            if (gameState === 'launched') {
                                checkGameOver();
                            }
                        }, 5000);
                    }
                } else {
                    gameState = 'ready';
                }
            }
        });

        // ACTUALIZACIÓN CONSTANTE
        Events.on(engine, 'beforeUpdate', () => {
            if (gameState === 'won' || gameState === 'lost') return;
            
            // MIENTRAS ARRASTRA
            if (gameState === 'dragging' && slingshot && slingshot.bodyB) {
                const dx = projectile.position.x - SLINGSHOT_X;
                const dy = projectile.position.y - SLINGSHOT_Y;
                let distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > MAX_STRETCH) {
                    const angle = Math.atan2(dy, dx);
                    const limitedX = SLINGSHOT_X + Math.cos(angle) * MAX_STRETCH;
                    const limitedY = SLINGSHOT_Y + Math.sin(angle) * MAX_STRETCH;
                    Body.setPosition(projectile, { x: limitedX, y: limitedY });
                    distance = MAX_STRETCH;
                }
                
                const distanceInMeters = distance / PIXEL_TO_METER;
                stretchDistStat.textContent = distanceInMeters.toFixed(2);
                
                potentialEnergy = 0.5 * k_spring * (distanceInMeters * distanceInMeters);
                maxPotentialEnergy = Math.max(maxPotentialEnergy, potentialEnergy);
                
                kineticEnergy = 0;
            } 
            // DESPUÉS DEL LANZAMIENTO
            else if (gameState === 'launched') {
                potentialEnergy = 0;
                stretchDistStat.textContent = '0.00';
                
                const velocityMagnitude = Vector.magnitude(projectile.velocity);
                const velocityMS = velocityMagnitude / 10;
                kineticEnergy = 0.5 * projectileMass * (velocityMS * velocityMS);
                velocityStat.textContent = velocityMS.toFixed(2);
                
                // DETECCIÓN MEJORADA DE PROYECTIL DETENIDO
                // Verifica si está prácticamente quieto
                if (velocityMagnitude < 0.1) {
                    if (!projectileStoppedTimer) {
                        projectileStoppedTimer = setTimeout(() => {
                            if (gameState === 'launched') {
                                resetProjectile();
                            }
                        }, 1500);
                    }
                } else {
                    // Si se vuelve a mover, cancelar timer
                    if (projectileStoppedTimer) {
                        clearTimeout(projectileStoppedTimer);
                        projectileStoppedTimer = null;
                    }
                }
            }
            
            updateStatsUI();
            updateTimer();
            
            // VERIFICAR VICTORIA
            if (goalBox && goalBox.position.y > GOAL_FALL_THRESHOLD && gameState === 'launched') {
                handleVictory();
            }
        });

        // COLISIONES
        Events.on(engine, 'collisionStart', (event) => {
            if (gameState !== 'launched') return;

            event.pairs.forEach(pair => {
                const bodyA = pair.bodyA;
                const bodyB = pair.bodyB;
                
                if ((bodyA.label === 'projectile' && (bodyB.label === 'box' || bodyB.label === 'goalBox')) ||
                    (bodyB.label === 'projectile' && (bodyA.label === 'box' || bodyA.label === 'goalBox'))) {
                    
                    if (launchKineticEnergy > 0 && workOnImpact === 0) {
                        workOnImpact = launchKineticEnergy * 0.75;
                        const efficiency = (workOnImpact / maxPotentialEnergy) * 100;
                        efficiencyStat.textContent = `${efficiency.toFixed(0)}%`;
                    }
                }
            });
        });

        // BOTONES
        document.getElementById('level1-btn').addEventListener('click', () => {
            if (gameState === 'ready' || gameState === 'won' || gameState === 'lost') {
                loadLevel(1);
            }
        });
        
        document.getElementById('level2-btn').addEventListener('click', () => {
            if (gameState === 'ready' || gameState === 'won' || gameState === 'lost') {
                loadLevel(2);
            }
        });
        
        document.getElementById('level3-btn').addEventListener('click', () => {
            if (gameState === 'ready' || gameState === 'won' || gameState === 'lost') {
                loadLevel(3);
            }
        });
        
        resetBtn.addEventListener('click', () => {
            loadLevel(currentLevel);
        });
        
        nextLevelBtn.addEventListener('click', () => {
            modalWin.classList.add('hidden');
            if (currentLevel >= MAX_LEVEL) {
                showFinalModal();
            } else {
                loadLevel(currentLevel + 1);
            }
        });

        retryLevelBtn.addEventListener('click', () => {
            modalGameOver.classList.add('hidden');
            loadLevel(currentLevel);
        });

        restartBtn.addEventListener('click', () => {
            modalFinal.classList.add('hidden');
            levelTimes = [null, null, null];
            totalLaunches = 0;
            updateTimesDisplay();
            loadLevel(1);
        });
    }

    // ========================================
    // LÓGICA DEL JUEGO
    // ========================================
    function resetProjectile() {
        if (projectileStoppedTimer) {
            clearTimeout(projectileStoppedTimer);
            projectileStoppedTimer = null;
        }
        
        if (attemptsLeft > 0 && gameState === 'launched') {
            gameState = 'ready';
            
            World.remove(world, projectile);
            if (slingshot) {
                World.remove(world, slingshot);
            }
            
            projectile = Bodies.circle(SLINGSHOT_X, SLINGSHOT_Y, 15, {
                density: 0.002,
                restitution: 0.5,
                friction: 0.1,
                frictionAir: 0.02,
                label: 'projectile',
                render: { 
                    fillStyle: '#ffffff',
                    strokeStyle: '#a855f7',
                    lineWidth: 3
                }
            });
            
            slingshot = Constraint.create({
                pointA: { x: SLINGSHOT_X, y: SLINGSHOT_Y },
                bodyB: projectile,
                stiffness: 0.05,
                length: 0,
                render: { 
                    strokeStyle: '#fbbf24',
                    lineWidth: 4,
                    type: 'line'
                }
            });
            
            World.add(world, [projectile, slingshot]);
            
            potentialEnergy = 0;
            kineticEnergy = 0;
            workOnImpact = 0;
            maxPotentialEnergy = 0;
            launchKineticEnergy = 0;
            velocityStat.textContent = '0.0';
            updateStatsUI();
        } else if (attemptsLeft === 0) {
            checkGameOver();
        }
    }

    function checkGameOver() {
        if (gameState === 'won') return;
        
        gameState = 'lost';
        const levelTime = ((Date.now() - levelStartTime) / 1000).toFixed(1);
        document.getElementById('gameover-time').textContent = levelTime + 's';
        modalGameOver.classList.remove('hidden');
    }

    function handleVictory() {
        if (projectileStoppedTimer) {
            clearTimeout(projectileStoppedTimer);
            projectileStoppedTimer = null;
        }
        
        gameState = 'won';
        
        const levelTime = ((Date.now() - levelStartTime) / 1000).toFixed(1);
        levelTimes[currentLevel - 1] = parseFloat(levelTime);
        updateTimesDisplay();
        
        const efficiency = maxPotentialEnergy > 0 ? (workOnImpact / maxPotentialEnergy) * 100 : 0;
        const attemptsUsed = MAX_ATTEMPTS - attemptsLeft;
        
        document.getElementById('modal-time').textContent = levelTime + 's';
        document.getElementById('modal-work').textContent = workOnImpact.toFixed(2) + ' J';
        document.getElementById('modal-launches').textContent = attemptsUsed + '/' + MAX_ATTEMPTS;
        document.getElementById('modal-efficiency').textContent = efficiency.toFixed(0) + '%';
        
        modalWin.classList.remove('hidden');
    }

    // ========================================
    // UI
    // ========================================
    function updateStatsUI() {
        potentialStat.textContent = potentialEnergy.toFixed(2);
        kineticStat.textContent = kineticEnergy.toFixed(2);
        workStat.textContent = workOnImpact.toFixed(2);
    }

    function updateTimer() {
        if (gameState === 'won' || gameState === 'lost') return;
        const currentTime = ((Date.now() - levelStartTime) / 1000).toFixed(1);
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

    function resetStats() {
        potentialEnergy = 0;
        kineticEnergy = 0;
        workOnImpact = 0;
        maxPotentialEnergy = 0;
        launchKineticEnergy = 0;
        goalBox = null;
        velocityStat.textContent = '0.0';
        efficiencyStat.textContent = '0%';
        stretchDistStat.textContent = '0.00';
        timeStat.textContent = '0.0';
        modalWin.classList.add('hidden');
        modalGameOver.classList.add('hidden');
        updateStatsUI();
    }

    // ========================================
    // INICIAR
    // ========================================
    init();
});