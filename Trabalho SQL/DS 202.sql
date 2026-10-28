
CREATE TABLE Alunos (
    id_aluno SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    telefone VARCHAR(20),
    data_nascimento DATE NOT NULL,
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabela de Professores
CREATE TABLE Professores (
    id_professor SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    telefone VARCHAR(20),
    idioma_especialidade VARCHAR(50) NOT NULL
);

-- 3. Tabela de Cursos
CREATE TABLE Cursos (
    id_curso SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    idioma VARCHAR(50) NOT NULL,
    nivel VARCHAR(20) CHECK (nivel IN ('Básico', 'Intermediário', 'Avançado', 'Fluente')),
    carga_horaria INT NOT NULL
);

-- 4. Tabela de Turmas
CREATE TABLE Turmas (
    id_turma SERIAL PRIMARY KEY,
    id_curso INT NOT NULL REFERENCES Cursos(id_curso) ON DELETE CASCADE,
    id_professor INT REFERENCES Professores(id_professor) ON DELETE SET NULL,
    semestre VARCHAR(10) NOT NULL,
    horario VARCHAR(50) NOT NULL,
    vagas_maximas INT DEFAULT 15,
    status VARCHAR(20) DEFAULT 'Ativa' CHECK (status IN ('Ativa', 'Concluída', 'Cancelada'))
);

-- 5. Tabela de Matrículas
CREATE TABLE Matriculas (
    id_matricula SERIAL PRIMARY KEY,
    id_aluno INT NOT NULL REFERENCES Alunos(id_aluno) ON DELETE CASCADE,
    id_turma INT NOT NULL REFERENCES Turmas(id_turma) ON DELETE CASCADE,
    data_matricula DATE DEFAULT CURRENT_DATE,
    status VARCHAR(20) DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Trancado', 'Concluído', 'Cancelado')),
    nota_final DECIMAL(4,2),
    UNIQUE (id_aluno, id_turma)
); 

-- 1. Inserts para Alunos
INSERT INTO Alunos (nome, email, telefone, data_nascimento) VALUES
('Lucas Silva', 'lucas.silva@email.com', '(11) 98765-4321', '2002-05-14'),
('Mariana Oliveira', 'mariana.o@email.com', '(21) 99876-5432', '1998-11-20'),
('Carlos Eduardo', 'carlos.edu@email.com', '(31) 97654-3210', '2005-03-08'),
('Beatriz Santos', 'beatriz.santos@email.com', '(41) 98888-7777', '2001-09-12'),
('Gabriel Costa', 'gabriel.costa@email.com', '(51) 99999-1111', '1995-01-30');

-- 2. Inserts para Professores
INSERT INTO Professores (nome, email, telefone, idioma_especialidade) VALUES
('John Smith', 'john.smith@escola.com', '(11) 91111-2222', 'Inglês'),
('Claire Dubois', 'claire.dubois@escola.com', '(11) 92222-3333', 'Francês'),
('Gonzalo Ramírez', 'gonzalo.ramirez@escola.com', '(11) 93333-4444', 'Espanhol'),
('Hans Müller', 'hans.muller@escola.com', '(11) 94444-5555', 'Alemão');

-- 3. Inserts para Cursos
INSERT INTO Cursos (nome, idioma, nivel, carga_horaria) VALUES
('Inglês Geral I', 'Inglês', 'Básico', 60),
('Inglês Intermediário II', 'Inglês', 'Intermediário', 80),
('Español Conversación', 'Espanhol', 'Avançado', 40),
('Français Élémentaire', 'Francês', 'Básico', 60),
('Deutsch A1', 'Alemão', 'Básico', 60);

-- 4. Inserts para Turmas (id_curso, id_professor)
INSERT INTO Turmas (id_curso, id_professor, semestre, horario, vagas_maximas, status) VALUES
(1, 1, '2026/1', 'Seg/Qua 19:00-20:30', 15, 'Ativa'),
(2, 1, '2026/1', 'Ter/Qui 08:00-09:30', 12, 'Ativa'),
(3, 3, '2026/1', 'Sáb 09:00-12:00', 10, 'Ativa'),
(4, 2, '2026/1', 'Seg/Qua 18:00-19:30', 15, 'Ativa'),
(5, 4, '2026/1', 'Ter/Qui 19:30-21:00', 10, 'Ativa');

-- 5. Inserts para Matrículas (id_aluno, id_turma)
INSERT INTO Matriculas (id_aluno, id_turma, status, nota_final) VALUES
(1, 1, 'Ativo', NULL),
(2, 2, 'Ativo', NULL),
(3, 1, 'Ativo', NULL),
(4, 3, 'Ativo', NULL),
(5, 4, 'Concluído', 9.5);

USE escola_idiomas;

-- 1. EXPLAIN Padrão (Tabular: avalia type, possible_keys, key e key_len)
EXPLAIN
SELECT 
    c.nome AS curso,
    p.nome AS professor,
    t.horario
FROM Turmas t
JOIN Cursos c ON t.id_curso = c.id_curso
LEFT JOIN Professores p ON t.id_professor = p.id_professor
WHERE t.status = 'Ativa';

-- 2. EXPLAIN em formato JSON (Permite visualizar o Custo Estimado / query_cost)
EXPLAIN FORMAT=JSON
SELECT 
    c.nome AS curso,
    p.nome AS professor,
    t.horario
FROM Turmas t
JOIN Cursos c ON t.id_curso = c.id_curso
LEFT JOIN Professores p ON t.id_professor = p.id_professor
WHERE t.status = 'Ativa';

-- 1. Atualização prévia das estatísticas do banco
ANALYZE TABLE Alunos, Professores, Cursos, Turmas, Matriculas;

-- 2. EXPLAIN ANALYZE aplicado sobre uma ÚNICA consulta consolidada (Dashboard Completo)
EXPLAIN (ANALYZE TABLE, BUFFERS, VERBOSE)
WITH ResumoMatriculas AS (
    -- Agrupa dados de matrículas e desempenho por turma
    SELECT 
        t.id_turma,
        t.id_curso,
        t.id_professor,
        t.vagas_maximas,
        COUNT(m.id_matricula) AS total_matriculas,
        COUNT(m.id_matricula) FILTER (WHERE m.status = 'Ativo') AS alunos_ativos,
        COUNT(m.id_matricula) FILTER (WHERE m.status = 'Concluído') AS alunos_concluidos,
        COUNT(m.id_matricula) FILTER (WHERE m.status = 'Cancelado') AS alunos_cancelados,
        AVG(m.nota_final) AS media_notas
    FROM Turmas t
    LEFT JOIN Matriculas m ON t.id_turma = m.id_turma
    GROUP BY t.id_turma, t.id_curso, t.id_professor, t.vagas_maximas
)
SELECT 
    c.idioma,
    c.nome AS curso,
    c.nivel,
    p.nome AS professor,
    t.semestre,
    t.horario,
    rm.vagas_maximas,
    rm.alunos_ativos,
    ROUND((rm.alunos_ativos::NUMERIC / NULLIF(rm.vagas_maximas, 0)) * 100, 2) AS percentual_ocupacao,
    rm.total_matriculas,
    rm.alunos_concluidos,
    rm.alunos_cancelados,
    ROUND(rm.media_notas, 2) AS media_nota_turma
FROM Turmas t
JOIN Cursos c ON t.id_curso = c.id_cursovw_turmas_idiomas
LEFT JOIN Professores p ON t.id_professor = p.id_professor
JOIN ResumoMatriculas rm ON t.id_turma = rm.id_turma
ORDER BY c.idioma, c.nome, t.semestre;