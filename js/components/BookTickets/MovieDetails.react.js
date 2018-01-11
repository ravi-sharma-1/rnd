import React, { Component } from 'react';
import _ from 'lodash';
import moment from 'moment';
import './MovieDetails.scss';

class MovieDetails extends Component {
    constructor() {
        super();
    }

    calculateTotalPrice(obj) {
        let fields = ['3D_cgst', '3D_ltax', '3D_nett', '3D_sgst', 'cgst', 'l_tax', 'sgst', 'price', 'maintenance_cgst', 'maintenance_sgst', 'maintenance_ltax', 'maintenance_nett'];
        let finalPrice = 0;
        fields.map((field) => {
            finalPrice = finalPrice + _.get(obj, `[${field}]`, 0);
        });
        return finalPrice.toFixed(2);
    }

    render() {
        const { movie } = this.props;
        movie.sessions = movie.sessions.sort((a, b) => {
            return (moment(new Date(a.start_date_time)) - moment(new Date(b.start_date_time)));
        });
        return (
            <div className="movieDetails">
                <img src={movie.web_cover_url} />
                <div className="showDetails">
                    <div className="name">{movie.display}</div>
                    <div className="language">{movie.language}</div>
                    <div className="timings">
                        {_.map(Object.keys(movie.sessions), (instanceKey, j) => {
                            let instance = movie.sessions[instanceKey];
                            return (<p
                                onClick={() => { this.props.handleShowLayoutSet({ instanceId: instanceKey, instance, censor: movie.censor, duration: movie.duration, display: movie.display, language: movie.language, projection: movie.projection }); }}
                                className={'tooltip '}
                                key={j}>
                                {moment(instance.start_date_time).format('hh:mm A')}
                                <span className="tooltiptext">
                                    <span className="audi">{instance.audi_name}</span>
                                    {_.map(Object.keys(instance.categories), (cat, i) => {
                                        let category = `${instance.categories[cat].available_count} Seats (Rs ${this.calculateTotalPrice(instance.categories[cat])})`;
                                        return (<span key={i}><span className="cat">{instance.categories[cat].seat_category}</span><span>{category}</span></span>);
                                    })}
                                </span>
                            </p>);
                        })}
                    </div>
                </div>
            </div>
        );
    }
}

export default MovieDetails;

