FROM php:8.3-apache
RUN apt-get update && apt-get install -y --no-install-recommends libpq-dev libcurl4-openssl-dev libonig-dev \
    && docker-php-ext-install pdo_pgsql curl mbstring \
    && rm -rf /var/lib/apt/lists/*
RUN a2enmod headers
COPY php.ini /usr/local/etc/php/conf.d/uploads.ini
COPY *.php /var/www/html/
