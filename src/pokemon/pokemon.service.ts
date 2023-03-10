import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { copyFile } from 'fs';
import { isValidObjectId, Model } from 'mongoose';
import { CreatePokemonDto } from './dto/create-pokemon.dto';
import { UpdatePokemonDto } from './dto/update-pokemon.dto';
import { Pokemon } from './entities/pokemon.entity';
import { PaginationDto } from '../common/dto/pagination.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PokemonService {

  private readonly defaultLimit: number;

  constructor(
    @InjectModel(Pokemon.name)
    private readonly pokemonModel: Model<Pokemon>,
    private readonly configService: ConfigService,
  ) {
    this.defaultLimit = configService.get<number>('defaultLimit');
  }

  async create(createPokemonDto: CreatePokemonDto) {
    createPokemonDto.name = createPokemonDto.name.toLocaleUpperCase();

    try {
      const pokemon = await this.pokemonModel.create(createPokemonDto);

      return pokemon;
    } catch(error) {
      this.handleExceptions(error);
    }
  }

  findAll(paginationDto: PaginationDto) {
    const { limit = this.defaultLimit, offset = 0 } = paginationDto;
    return this.pokemonModel.find()
      .limit(limit)
      .skip(offset)
      .sort({ no: 1 })
      .select('-__v');
  }

  async findOne(term) {
    let pokemon: Pokemon;

    if(!isNaN(+term)) {
      pokemon = await this.pokemonModel.findOne({no : term});
    }

    //MONGO ID
    if(!pokemon && isValidObjectId(term)) {
      pokemon = await this.pokemonModel.findById(term)

    }

    //NAME
    if(!pokemon) {
      pokemon = await this.pokemonModel.findOne({ name: term.toUpperCase().trim() })
    }

    if(! pokemon) throw new NotFoundException(`Pkemon wtih ID or Name or no "${term}" not found`)

    return pokemon;
  }

  async update(term: string, updatePokemonDto: UpdatePokemonDto) {

    const pokemon = await this.findOne( term );

      if(updatePokemonDto.name) {
        updatePokemonDto.name = updatePokemonDto.name.toLocaleUpperCase();
      }

      try {
        await pokemon.updateOne(updatePokemonDto, { new: true });

        return {...pokemon.toJSON(), ...updatePokemonDto};
      } catch(error) {
        this.handleExceptions(error);
      }
  }

  async remove(term: string) {
    const { deletedCount } = await this.pokemonModel.deleteOne({ _id: term });

    if(deletedCount === 0) {
      throw new BadRequestException(`Pokemon with ID "${term}" not found`);
    }

    return;
  }

  private handleExceptions( error: any) {
    if(error.code === 11000) {
      throw new BadRequestException(`Pokemon exists in db ${JSON.stringify(error.keyValue)}`);
    }
    console.log(error);

    throw new InternalServerErrorException(`Can't create Pokemon - Check server logs`);
  }
}
