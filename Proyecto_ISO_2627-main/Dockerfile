# Etapa 1: compilar Angular
FROM node:24-bookworm-slim AS frontend-build

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build -- --configuration production


# Etapa 2: compilar Spring Boot e incorporar Angular
# Java 21.0.13.1 como mínimo (corrige Java4Shell). Imagen fijada por etiqueta y digest:
# para actualizarla, ver docs/CI-CD-Render.md («Versión de Java»).
FROM maven:3.10.0-eclipse-temurin-21@sha256:3e18d95a0a49d18aa5b075e5ee3c30a98078c382850467dcd4caa49bb7dc4038 AS backend-build

WORKDIR /app/backend

COPY backend/pom.xml ./
COPY backend/src ./src

# Angular compilado dentro de los recursos estáticos de Spring Boot
COPY --from=frontend-build \
    /app/frontend/dist/frontend/browser/ \
    /app/backend/src/main/resources/static/

# Las pruebas se ejecutan en CI; aquí generamos el JAR
RUN mvn -B -DskipTests package


# Etapa 3: imagen final de ejecución
FROM eclipse-temurin:21.0.13.1_2-jre@sha256:b57b0a974dc5ba8b24009a97aeb9ffd178e172727736279e5de73605f40c6813

WORKDIR /app

COPY --from=backend-build \
    /app/backend/target/backend-0.0.1-SNAPSHOT.jar \
    /app/esibuy.jar

# Ejecutar sin privilegios de root
RUN groupadd --system esibuy \
    && useradd --system --gid esibuy esibuy \
    && mkdir -p /app/uploads/productos \
    && chown -R esibuy:esibuy /app

USER esibuy

EXPOSE 8080

ENV PORT=8080

ENTRYPOINT ["java", "-jar", "/app/esibuy.jar"]
