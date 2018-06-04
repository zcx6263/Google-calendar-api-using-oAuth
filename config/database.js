module.exports = {
    host: "localhost",
    user: "root",
    password: "", // input your database password 
    database:"my_db"
  };
  
  /*
  create database my_db;
  use my_db;
  create table schedule(
    seq int not null auto_increment primary key,
    startDate datetime,
    endDate datetime,
    description varchar(100));
  
    insert into schedule(startDate, endDate, description) values('2016-09-30','2016-09-30','title');
  )
  */