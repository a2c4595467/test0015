FROM nginx:1.21.4-alpine

COPY ./nginx/etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf
RUN chmod 644 /etc/nginx/conf.d/default.conf

# COPY ./nginx/certs/cert.pem /etc/nginx/cert.pem
# RUN chmod 600 /etc/nginx/cert.pem

# COPY ./nginx/certs/key.pem /etc/nginx/key.pem
# RUN chmod 600 /etc/nginx/key.pem
