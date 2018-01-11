 const testData = {

     addCinema: {
         table: 'cinemas',
         data: [
             {
                 "id": 19,
                 "name": "abc",
                 "pin": 230120,
                 "city": "Noida",
                 "address": "MovieTime",
                 "cutoff_time": 60,
                 "pos_cutoff_time": -10,
                 "created_at": "2017-01-25 11:10:22",
                 "updated_at": "2017-02-08 11:04:35",
                 "is_enabled": 1
                }
            ]
     },

     selCinema: {
         table: 'cinemas',
         data: {
             id: '19'
         }
     },

     delCinema: {
         table: 'cinemas',
         data: {
             id: '19'
         }
     },

     addMov:{
         table: "movies",
         data:[
             {
                 "id": 116,
                 "display": "Dangal",
                 "duration": 70,
                 "language": "Hindi",
                 "projection": "2D",
                 "censor": "U/A",
                 "web_cover_url": "https://s3-ap-southeast-1.amazonaws.com/assets.paytm.com/seats/merchant_assets/267063/dgl.jpg",
                 "created_at": "2016-10-18 12:29:51",
                 "updated_at": "2017-02-08 11:28:13",
                 "is_active": 1,
                 "is_enabled": 1
             }
         ]
     },
     addSession:{
         table: "sessions",
         data: [
             {
                 "id": 689,
                 "audi_id": 875,
                 "movie_id":116,
                 "inst_duration": 140,
                 "start_date_time": "2017-04-26 11:02:49",
                 "end_date_time": "2017-01-06 17:12:59",
                 "created_at": "2016-10-18 12:33:03",
                 "updated_at": "2017-01-25 11:17:38",
                 "is_enabled": 1,
                 "categories":[
                     {
                         "seat_category": "BALCONY",
                         "available_count": 190,
                         "total_count": 190,
                         "price": 200,
                         "price_details": {
                             "e_tax": 0
                         },
                         "created_at": "2016-10-18 12:33:03",
                         "updated_at": "2016-10-18 12:33:03",
                         "is_enabled": 1
                     }
                 ]

             }
         ]
     },
     // addMovSess: {
     //     table: 'movieSessions',
     //     data: [
     //         {
     //             "id": 116,
     //             "display": "Dangal",
     //             "duration": 70,
     //             "language": "Hindi",
     //             "projection": "2D",
     //             "censor": "U/A",
     //             "web_cover_url": "https://s3-ap-southeast-1.amazonaws.com/assets.paytm.com/seats/merchant_assets/267063/dgl.jpg",
     //             "created_at": "2016-10-18 12:29:51",
     //             "updated_at": "2017-02-08 11:28:13",
     //             "is_active": 1,
     //             "is_enabled": 1,
     //             "session": [
     //                 {
     //                     "id": 689,
     //                     "audi_id": 875,
     //                     "inst_duration": 140,
     //                     "start_date_time": "2017-04-26 11:02:49",
     //                     "end_date_time": "2017-01-06 17:12:59",
     //                     "created_at": "2016-10-18 12:33:03",
     //                     "updated_at": "2017-01-25 11:17:38",
     //                     "is_enabled": 1,
     //                     "categories": [
     //                         {
     //                             "seat_category": "BALCONY",
     //                             "available_count": 190,
     //                             "total_count": 190,
     //                             "price": 200,
     //                             "price_details": {
     //                                 "e_tax": 0
     //                             },
     //                             "created_at": "2016-10-18 12:33:03",
     //                             "updated_at": "2016-10-18 12:33:03",
     //                             "is_enabled": 1
     //                            }
     //                        ]
     //                    }]
     //            }
     //        ]
     // },

     addAudi: {
         table: 'audis',
         data: [
             {
                 "id": 875,
                 "name": "SCREEN-1",
                 "layout": "0,A,DC_CLASS,0-1-1|1-1-2|2-0-3|3-1-4",
                 "seat_category_map": "DC_CLASS-6-22-0-20-0-0-BALCONY;SILVER_CLASS-25-22-0-20-0-0-SILVER CLASS",
                 "seat_count": 40,
                 "max_rows": 31,
                 "max_cols": 22,
                 "free_seating": 0,
                 "screen_on_top": 0,
                 "is_active": 1,
                 "created_at": "2017-01-06 11:31:01",
                 "updated_at": "2017-01-11 11:25:03",
                 "is_enabled": 1
             }

         ]
     },

     addUser: {
         table: 'users',
         data: [
             {
                 "id": 1,
                 "phone_number": "9999999990",
                 "role_id": 1,
                 "password": "uJijQR7p1IOq9dLdnoKR8J2Rn5A5Qk5DX5EVAMaFV1tb7W8Z+uVNbHLOjC9x",
                 "salt": "I1wcR0xwazX2IKsI8n5E1g==",
                 "username": "Praveen Tripathi",
                 "is_active": 1,
                 "role_info": {
                     "role": "admin"
                 },
                 "created_at": "2017-02-02 13:03:28",
                 "updated_at": "2017-02-02 13:04:36",
                 "is_enabled": 1
                }
            ]
     },

     addBookings: {
         table: 'bookings',
         data: [
             {
                 "booking_id": "0001017V2R0C8F",
                 "ssn_instance_id": 1341,
                 "seat_count": 1,
                 "seat_details": "DC_CLASS-0-0; DC_CLASS-0-1|DC CLASS-A-1;DC CLASS-A-5",
                 "pax_info": {},
                 "status": 4,
                 "print_status": 1,
                 "pos_user_id": 123,
                 "created_at": "2017-02-08 11:30:20",
                 "updated_at": "2017-02-08 11:30:29",
                 "isOnline": 1
             },
             {
                 "booking_id": "0001027V2X0G8Y",
                 "ssn_instance_id": 1328,
                 "seat_count": 1,
                 "seat_details": "DC_CLASS-0-1|DC CLASS-A-2",
                 "pax_info": {},
                 "status": 4,
                 "print_status": 1,
                 "pos_user_id": 123,
                 "created_at": "2017-02-08 11:30:20",
                 "updated_at": "2017-02-08 11:30:29",
                 "isOnline": 1
             },
             {
                 "booking_id": "9912027V2X0G8Y",
                 "ssn_instance_id": 1329,
                 "seat_count": 1,
                 "seat_details": "DC_CLASS-0-2|DC CLASS-A-3",
                 "pax_info": {},
                 "status": 4,
                 "print_status": 1,
                 "pos_user_id": 123,
                 "is_enabled": 1,
                 "created_at": "2017-02-08 11:30:20",
                 "updated_at": "2017-02-08 11:30:29",
                 "isOnline": 1
             },
             {
                 "booking_id": "9896027V2X0G8Y",
                 "ssn_instance_id": 1329,
                 "seat_count": 1,
                 "seat_details": "DC_CLASS-0-2|DC CLASS-A-3",
                 "pax_info": {},
                 "status": 4,
                 "print_status": 1,
                 "pos_user_id": 123,
                 "is_enabled": 1,
                 "created_at": "2017-02-08 11:30:20",
                 "updated_at": "2017-02-08 11:30:29",
                 "isOnline": 0
             },
             {
                 "booking_id": "9986027V2X0G8Y",
                 "ssn_instance_id": 1329,
                 "seat_count": 1,
                 "seat_details": "DC_CLASS-0-2|DC CLASS-A-3",
                 "pax_info": {},
                 "status": 4,
                 "print_status": 1,
                 "pos_user_id": 123,
                 "is_enabled": 1,
                 "created_at": "2017-02-08 11:30:20",
                 "updated_at": "2017-02-08 11:30:29",
                 "isOnline": 0
             }
         ]
     },

     addMasterInfo: {
         table: 'masterInfo',
         data: [{
             'is_master': 0,
             'machine_id': 'jsdnfkjsd8383'
            }]
     },

     selSeatLayout: {
        table: 'audis',
        data: {
            id: '875'
        }
    },

     selBookings_id: {
         table: 'bookings',
         data: {
             booking_id: '0001017V2R0C8F'
         }
     },

     selBookings_ssn: {
         table: 'bookings',
         data: {
             ssn_instance_id: '689'
         }
     }
 };

 module.exports = testData;
